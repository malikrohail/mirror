"""Navigation agent loop — one per persona per task.

This is THE core loop of Mirror. Each persona gets its own navigator
that drives a browser, takes screenshots, asks the LLM for decisions,
executes actions, and records every step.
"""

from __future__ import annotations

import asyncio
import io
import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from playwright.async_api import BrowserContext

from app.browser.actions import BrowserActions
from app.browser.cookie_consent import dismiss_cookie_consent
from app.browser.detection import PageDetection
from app.browser.screencast import CDPScreencastManager
from app.browser.screenshots import ScreenshotService
from app.config import settings
from app.llm.client import LLMClient
from app.llm.schemas import ActionType, NavigationDecision

logger = logging.getLogger(__name__)

MAX_STEPS_DEFAULT = 30
STUCK_THRESHOLD = 3  # same URL N times in a row → suggest give_up


class StepRecorder(Protocol):
    """Protocol for recording step data (implemented by Agent 1's infra)."""

    async def save_step(
        self,
        session_id: str,
        step_number: int,
        screenshot: bytes,
        decision: NavigationDecision,
        page_url: str,
        page_title: str,
        viewport_width: int,
        viewport_height: int,
        click_x: int | None,
        click_y: int | None,
    ) -> None: ...

    async def publish_step_event(
        self,
        session_id: str,
        persona_name: str,
        step_number: int,
        decision: NavigationDecision,
        screenshot_url: str,
    ) -> None: ...


@dataclass
class StepRecord:
    """In-memory record of a step for history tracking."""

    step_number: int
    page_url: str
    action_type: str
    think_aloud: str
    task_progress: int
    emotional_state: str
    click_x: int | None = None
    click_y: int | None = None
    screenshot_path: str | None = None
    page_title: str = ""
    action_error: str | None = None


@dataclass
class NavigationResult:
    """Result of a complete navigation session."""

    session_id: str
    persona_name: str
    task_completed: bool
    total_steps: int
    gave_up: bool
    error: str | None = None
    steps: list[StepRecord] = field(default_factory=list)


def _compute_visual_diff_score(prev_bytes: bytes, curr_bytes: bytes) -> float:
    """Compute a visual change score between two screenshots (0.0 = identical, 1.0 = completely different).

    Uses Pillow's ImageChops to compare pixel differences.
    Returns -1.0 if comparison fails (e.g., Pillow not available).
    """
    try:
        from PIL import Image, ImageChops

        prev_img = Image.open(io.BytesIO(prev_bytes)).convert("RGB")
        curr_img = Image.open(io.BytesIO(curr_bytes)).convert("RGB")

        # Resize to same dimensions if needed
        if prev_img.size != curr_img.size:
            curr_img = curr_img.resize(prev_img.size)

        diff = ImageChops.difference(prev_img, curr_img)
        # Sum of all pixel differences normalized to 0-1
        import numpy as np

        diff_array = np.array(diff, dtype=float)
        score = diff_array.sum() / (diff_array.size * 255.0)
        return float(score)
    except ImportError:
        return -1.0
    except Exception as e:
        logger.debug("Visual diff computation failed: %s", e)
        return -1.0


class Navigator:
    """Drives a single persona through a single task on a website.

    Features:
    - Retry logic for Playwright action failures (Iteration 2)
    - Screenshot diff overlay for detecting "nothing happened" clicks (Iteration 3)
    - Per-session timeout support (Iteration 2)
    """

    def __init__(
        self,
        llm_client: LLMClient,
        browser_actions: BrowserActions | None = None,
        screenshot_service: ScreenshotService | None = None,
        max_steps: int = MAX_STEPS_DEFAULT,
    ) -> None:
        self._llm = llm_client
        self._actions = browser_actions or BrowserActions()
        self._screenshots = screenshot_service or ScreenshotService()
        self._max_steps = max_steps
        self._action_retries = getattr(settings, "BROWSER_ACTION_RETRIES", 1)
        self._diff_enabled = getattr(settings, "SCREENSHOT_DIFF_ENABLED", False)

    async def navigate_session(
        self,
        session_id: str,
        persona: dict[str, Any],
        task_description: str,
        behavioral_notes: str,
        start_url: str,
        browser_context: BrowserContext,
        recorder: StepRecorder | None = None,
        screencast: CDPScreencastManager | None = None,
        session_timeout: int | None = None,
    ) -> NavigationResult:
        """Run the full navigation loop for one persona on one task.

        PERCEIVE → THINK → ACT → RECORD, repeated until done/stuck/max_steps.

        Args:
            session_timeout: Per-session timeout in seconds (Iteration 2).
                Defaults to settings.SESSION_TIMEOUT_SECONDS.
        """
        persona_name = persona.get("name", "Unknown")
        timeout_secs = session_timeout or getattr(settings, "SESSION_TIMEOUT_SECONDS", 120)

        logger.info(
            "Starting navigation: persona=%s, task=%s, url=%s, timeout=%ds",
            persona_name, task_description[:50], start_url, timeout_secs,
        )

        try:
            return await asyncio.wait_for(
                self._navigate_session_inner(
                    session_id=session_id,
                    persona=persona,
                    persona_name=persona_name,
                    task_description=task_description,
                    behavioral_notes=behavioral_notes,
                    start_url=start_url,
                    browser_context=browser_context,
                    recorder=recorder,
                    screencast=screencast,
                ),
                timeout=timeout_secs,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "Session timeout (%ds) for persona %s on %s",
                timeout_secs, persona_name, start_url,
            )
            return NavigationResult(
                session_id=session_id,
                persona_name=persona_name,
                task_completed=False,
                total_steps=0,
                gave_up=True,
                error=f"Session timed out after {timeout_secs}s",
            )

    async def _navigate_session_inner(
        self,
        session_id: str,
        persona: dict[str, Any],
        persona_name: str,
        task_description: str,
        behavioral_notes: str,
        start_url: str,
        browser_context: BrowserContext,
        recorder: StepRecorder | None = None,
        screencast: CDPScreencastManager | None = None,
    ) -> NavigationResult:
        """Inner navigation loop (wrapped by per-session timeout)."""
        page = await browser_context.new_page()
        steps: list[StepRecord] = []
        pending_record_tasks: list[asyncio.Task[None]] = []
        gave_up = False
        task_completed = False
        error: str | None = None
        prev_screenshot: bytes | None = None

        try:
            # Start CDP screencast if provided (fire-and-forget)
            if screencast is not None:
                try:
                    await screencast.start(page)
                except Exception as e:
                    logger.warning("Screencast start failed (non-fatal): %s", e)

            # Navigate to starting URL with retry
            await self._goto_with_retry(page, start_url)

            # Auto-dismiss cookie consent banners
            try:
                await dismiss_cookie_consent(page)
            except Exception as e:
                logger.debug("Cookie consent dismissal failed: %s", e)

            # Check for auth walls and CAPTCHAs
            blockers = await PageDetection.detect_blockers(page, start_url)
            if blockers:
                for blocker in blockers:
                    logger.warning(
                        "Blocker detected: %s — %s",
                        blocker["type"], blocker["message"],
                    )
                    if blocker["type"] == "captcha":
                        error = f"CAPTCHA detected at {page.url}"
                        return NavigationResult(
                            session_id=session_id,
                            persona_name=persona_name,
                            task_completed=False,
                            total_steps=0,
                            gave_up=False,
                            error=error,
                        )

            for step_number in range(1, self._max_steps + 1):
                try:
                    step_result, curr_screenshot, record_task = await self._execute_step(
                        page=page,
                        session_id=session_id,
                        persona=persona,
                        persona_name=persona_name,
                        task_description=task_description,
                        behavioral_notes=behavioral_notes,
                        step_number=step_number,
                        history=steps,
                        recorder=recorder,
                        prev_screenshot=prev_screenshot,
                    )
                    steps.append(step_result)
                    prev_screenshot = curr_screenshot

                    # Collect background RECORD task if present
                    if record_task is not None:
                        pending_record_tasks.append(record_task)

                    # Check termination conditions
                    if step_result.action_type in ("done", "give_up"):
                        if step_result.action_type == "done":
                            task_completed = True
                        else:
                            gave_up = True
                        break

                    if step_result.task_progress >= 95:
                        task_completed = True
                        break

                    # Stuck detection
                    if self._is_stuck(steps):
                        logger.warning(
                            "Persona %s appears stuck on %s, suggesting give_up",
                            persona_name, step_result.page_url,
                        )
                        gave_up = True
                        break

                except Exception as e:
                    logger.error(
                        "Step %d failed for persona %s: %s",
                        step_number, persona_name, e,
                    )
                    # Record error but continue to next step
                    steps.append(StepRecord(
                        step_number=step_number,
                        page_url=page.url,
                        action_type="error",
                        think_aloud=f"Something went wrong: {e}",
                        task_progress=steps[-1].task_progress if steps else 0,
                        emotional_state="frustrated",
                    ))

        except Exception as e:
            error = str(e)
            logger.error(
                "Navigation session failed for persona %s: %s", persona_name, e,
            )
        finally:
            # Await all pending RECORD tasks before closing the page/session.
            # This ensures every step's data is persisted and published before
            # we return the NavigationResult.
            if pending_record_tasks:
                results = await asyncio.gather(
                    *pending_record_tasks, return_exceptions=True,
                )
                for i, result in enumerate(results):
                    if isinstance(result, Exception):
                        logger.error(
                            "Background record task %d failed for session %s: %s",
                            i, session_id, result,
                        )

            # Stop screencast before closing page
            if screencast is not None:
                try:
                    await screencast.stop()
                except Exception:
                    pass
            try:
                await page.close()
            except Exception:
                pass

        nav_result = NavigationResult(
            session_id=session_id,
            persona_name=persona_name,
            task_completed=task_completed,
            total_steps=len(steps),
            gave_up=gave_up,
            error=error,
            steps=steps,
        )
        logger.info(
            "Navigation complete: persona=%s, steps=%d, completed=%s, gave_up=%s",
            persona_name, len(steps), task_completed, gave_up,
        )
        return nav_result

    async def _goto_with_retry(self, page: Any, url: str) -> None:
        """Navigate to a URL with retry on TimeoutError / TargetClosedError."""
        for attempt in range(1 + self._action_retries):
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=15_000)
                return
            except Exception as e:
                error_name = type(e).__name__
                if error_name in ("TimeoutError", "TargetClosedError") and attempt < self._action_retries:
                    logger.warning("goto retry %d/%d for %s: %s", attempt + 1, self._action_retries, url, e)
                    await asyncio.sleep(1)
                    continue
                raise

    async def _execute_step(
        self,
        page: Any,
        session_id: str,
        persona: dict[str, Any],
        persona_name: str,
        task_description: str,
        behavioral_notes: str,
        step_number: int,
        history: list[StepRecord],
        recorder: StepRecorder | None,
        prev_screenshot: bytes | None = None,
    ) -> tuple[StepRecord, bytes, asyncio.Task[None] | None]:
        """Execute a single PERCEIVE → THINK → ACT → RECORD cycle.

        Returns (StepRecord, screenshot_bytes, record_task) — screenshot is
        returned for visual diff computation in the next step (Iteration 3).
        The record_task is a background asyncio.Task for the RECORD phase
        (publish_step_event + save_step) that runs concurrently with the next
        step's PERCEIVE phase. The caller must await it before the session ends.
        """

        # 1. PERCEIVE
        screenshot = await self._screenshots.capture_screenshot(page)
        a11y_tree = await self._screenshots.get_accessibility_tree(page)
        metadata = await self._screenshots.get_page_metadata(page)

        # Screenshot diff: compare with previous step (Iteration 3)
        if self._diff_enabled and prev_screenshot is not None:
            diff_score = _compute_visual_diff_score(prev_screenshot, screenshot)
            if diff_score >= 0:
                logger.debug(
                    "Step %d visual diff score: %.4f%s",
                    step_number,
                    diff_score,
                    " (no visual change!)" if diff_score < 0.001 else "",
                )

        # 2. THINK (LLM call)
        history_summary = self._build_history_summary(history)
        decision = await self._llm.navigate_step(
            persona=persona,
            task_description=task_description,
            behavioral_notes=behavioral_notes,
            screenshot=screenshot,
            a11y_tree=a11y_tree,
            page_url=metadata.url,
            page_title=metadata.title,
            step_number=step_number,
            history_summary=history_summary,
        )

        logger.debug(
            "Step %d [%s]: %s → %s (progress=%d%%, emotion=%s)",
            step_number, persona_name, decision.think_aloud[:60],
            decision.action.description, decision.task_progress,
            decision.emotional_state.value,
        )

        # 3. GET CLICK POSITION (before acting — element may disappear after click)
        click_x: int | None = None
        click_y: int | None = None

        if decision.action.type == ActionType.click:
            # Try the CSS selector first
            if decision.action.selector:
                pos = await self._screenshots.get_click_position(
                    page, decision.action.selector
                )
                if pos:
                    click_x, click_y = pos

            # Fallback: use viewport center as approximate click position
            # so heatmap always has data for click actions
            if click_x is None and click_y is None:
                viewport = page.viewport_size
                if viewport:
                    click_x = viewport["width"] // 2
                    click_y = viewport["height"] // 2

        # 4. ACT (with retry logic — Iteration 2)
        action_error: str | None = None
        if decision.action.type not in (ActionType.done, ActionType.give_up):
            action_kwargs: dict[str, Any] = {}
            if decision.action.selector:
                action_kwargs["selector"] = decision.action.selector
            if decision.action.value:
                action_kwargs["value"] = decision.action.value

            action_result = await self._execute_action_with_retry(
                page, decision.action.type.value, **action_kwargs
            )

            if not action_result.success:
                action_error = action_result.error
                logger.warning(
                    "Action failed at step %d: %s", step_number, action_error,
                )

        # 5. RECORD (fire as background task so next step's PERCEIVE starts immediately)
        record_task: asyncio.Task[None] | None = None
        if recorder:
            record_task = asyncio.create_task(
                self._record_step_background(
                    recorder=recorder,
                    session_id=session_id,
                    persona_name=persona_name,
                    step_number=step_number,
                    screenshot=screenshot,
                    decision=decision,
                    page_url=metadata.url,
                    page_title=metadata.title,
                    viewport_width=metadata.viewport_width,
                    viewport_height=metadata.viewport_height,
                    click_x=click_x,
                    click_y=click_y,
                ),
                name=f"record-step-{session_id}-{step_number}",
            )

        return StepRecord(
            step_number=step_number,
            page_url=metadata.url,
            action_type=decision.action.type.value,
            think_aloud=decision.think_aloud,
            task_progress=decision.task_progress,
            emotional_state=decision.emotional_state.value,
            action_error=action_error,
        ), screenshot, record_task

    @staticmethod
    async def _record_step_background(
        recorder: StepRecorder,
        session_id: str,
        persona_name: str,
        step_number: int,
        screenshot: bytes,
        decision: NavigationDecision,
        page_url: str,
        page_title: str,
        viewport_width: int,
        viewport_height: int,
        click_x: int | None,
        click_y: int | None,
    ) -> None:
        """Background coroutine for the RECORD phase.

        Publishes the WebSocket step event first (so the frontend gets the
        update ASAP), then persists the step data. Exceptions are logged but
        never propagated — a failed record must not crash the navigation loop.
        """
        try:
            # Publish first — sends the real-time WebSocket update to the frontend
            await recorder.publish_step_event(
                session_id=session_id,
                persona_name=persona_name,
                step_number=step_number,
                decision=decision,
                screenshot_url=f"{session_id}/steps/step_{step_number:03d}.png",
            )
        except Exception:
            logger.error(
                "Background publish_step_event failed for step %d of session %s",
                step_number, session_id, exc_info=True,
            )

        try:
            # Then persist the full step data (screenshot + metadata)
            await recorder.save_step(
                session_id=session_id,
                step_number=step_number,
                screenshot=screenshot,
                decision=decision,
                page_url=page_url,
                page_title=page_title,
                viewport_width=viewport_width,
                viewport_height=viewport_height,
                click_x=click_x,
                click_y=click_y,
            )
        except Exception:
            logger.error(
                "Background save_step failed for step %d of session %s",
                step_number, session_id, exc_info=True,
            )

    async def _execute_action_with_retry(
        self, page: Any, action_type: str, **kwargs: Any
    ) -> Any:
        """Execute a browser action with retry on transient failures.

        Retries on TimeoutError and TargetClosedError up to _action_retries times.
        """
        last_error: Exception | None = None
        for attempt in range(1 + self._action_retries):
            try:
                return await self._actions.execute(page, action_type, **kwargs)
            except Exception as e:
                error_name = type(e).__name__
                if error_name in ("TimeoutError", "TargetClosedError") and attempt < self._action_retries:
                    logger.warning(
                        "Action retry %d/%d for %s: %s",
                        attempt + 1, self._action_retries, action_type, e,
                    )
                    await asyncio.sleep(0.5)
                    last_error = e
                    continue
                raise
        # Should not reach here, but just in case
        if last_error:
            raise last_error
        raise RuntimeError("Action retry exhausted unexpectedly")

    @staticmethod
    def _build_history_summary(history: list[StepRecord]) -> str:
        """Build a concise summary of previous steps for the LLM context."""
        if not history:
            return ""
        lines = []
        for step in history[-5:]:  # Last 5 steps to stay within token budget
            line = (
                f"Step {step.step_number}: [{step.emotional_state}] "
                f"{step.think_aloud[:80]} → {step.action_type} "
                f"(progress: {step.task_progress}%)"
            )
            if step.action_error:
                line += f" *** ACTION FAILED: {step.action_error} — DO NOT retry this selector ***"
            lines.append(line)
        return "\n".join(lines)

    @staticmethod
    def _is_stuck(history: list[StepRecord]) -> bool:
        """Detect if the persona is stuck (same URL N consecutive times with no progress,
        or consecutive action failures)."""
        if len(history) < STUCK_THRESHOLD:
            return False
        recent = history[-STUCK_THRESHOLD:]

        # Stuck if all recent actions failed
        all_failed = all(s.action_error is not None for s in recent)
        if all_failed:
            return True

        same_url = all(s.page_url == recent[0].page_url for s in recent)
        no_progress = all(
            s.task_progress == recent[0].task_progress for s in recent
        )
        return same_url and no_progress
