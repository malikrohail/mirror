"""Navigation agent loop — one per persona per task.

This is THE core loop of Mirror. Each persona gets its own navigator
that drives a browser, takes screenshots, asks the LLM for decisions,
executes actions, and records every step.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

from playwright.async_api import BrowserContext

from app.browser.actions import BrowserActions
from app.browser.cookie_consent import dismiss_cookie_consent
from app.browser.detection import PageDetection
from app.browser.screenshots import ScreenshotService
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


class Navigator:
    """Drives a single persona through a single task on a website."""

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

    async def navigate_session(
        self,
        session_id: str,
        persona: dict[str, Any],
        task_description: str,
        behavioral_notes: str,
        start_url: str,
        browser_context: BrowserContext,
        recorder: StepRecorder | None = None,
    ) -> NavigationResult:
        """Run the full navigation loop for one persona on one task.

        PERCEIVE → THINK → ACT → RECORD, repeated until done/stuck/max_steps.
        """
        persona_name = persona.get("name", "Unknown")
        logger.info(
            "Starting navigation: persona=%s, task=%s, url=%s",
            persona_name, task_description[:50], start_url,
        )

        page = await browser_context.new_page()
        steps: list[StepRecord] = []
        gave_up = False
        task_completed = False
        error: str | None = None

        try:
            # Navigate to starting URL
            await page.goto(start_url, wait_until="domcontentloaded", timeout=30_000)
            # Brief wait for JS frameworks to hydrate
            await page.wait_for_timeout(1500)

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
                    result = await self._execute_step(
                        page=page,
                        session_id=session_id,
                        persona=persona,
                        persona_name=persona_name,
                        task_description=task_description,
                        behavioral_notes=behavioral_notes,
                        step_number=step_number,
                        history=steps,
                        recorder=recorder,
                    )
                    steps.append(result)

                    # Check termination conditions
                    if result.action_type in ("done", "give_up"):
                        if result.action_type == "done":
                            task_completed = True
                        else:
                            gave_up = True
                        break

                    if result.task_progress >= 95:
                        task_completed = True
                        break

                    # Stuck detection
                    if self._is_stuck(steps):
                        logger.warning(
                            "Persona %s appears stuck on %s, suggesting give_up",
                            persona_name, result.page_url,
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
            try:
                await page.close()
            except Exception:
                pass

        result = NavigationResult(
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
        return result

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
    ) -> StepRecord:
        """Execute a single PERCEIVE → THINK → ACT → RECORD cycle."""

        # 1. PERCEIVE
        screenshot = await self._screenshots.capture_screenshot(page)
        a11y_tree = await self._screenshots.get_accessibility_tree(page)
        metadata = await self._screenshots.get_page_metadata(page)

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

        # 3. ACT
        click_x: int | None = None
        click_y: int | None = None

        if decision.action.type not in (ActionType.done, ActionType.give_up):
            action_kwargs: dict[str, Any] = {}
            if decision.action.selector:
                action_kwargs["selector"] = decision.action.selector
            if decision.action.value:
                action_kwargs["value"] = decision.action.value

            action_result = await self._actions.execute(
                page, decision.action.type.value, **action_kwargs
            )

            if not action_result.success:
                logger.warning(
                    "Action failed at step %d: %s", step_number, action_result.error,
                )

            # Get click position for heatmap data
            if (
                decision.action.type == ActionType.click
                and decision.action.selector
            ):
                pos = await self._screenshots.get_click_position(
                    page, decision.action.selector
                )
                if pos:
                    click_x, click_y = pos

        # 4. RECORD
        if recorder:
            await recorder.save_step(
                session_id=session_id,
                step_number=step_number,
                screenshot=screenshot,
                decision=decision,
                page_url=metadata.url,
                page_title=metadata.title,
                viewport_width=metadata.viewport_width,
                viewport_height=metadata.viewport_height,
                click_x=click_x,
                click_y=click_y,
            )
            await recorder.publish_step_event(
                session_id=session_id,
                persona_name=persona_name,
                step_number=step_number,
                decision=decision,
                screenshot_url=f"{session_id}/steps/step_{step_number:03d}.png",
            )

        return StepRecord(
            step_number=step_number,
            page_url=metadata.url,
            action_type=decision.action.type.value,
            think_aloud=decision.think_aloud,
            task_progress=decision.task_progress,
            emotional_state=decision.emotional_state.value,
        )

    @staticmethod
    def _build_history_summary(history: list[StepRecord]) -> str:
        """Build a concise summary of previous steps for the LLM context."""
        if not history:
            return ""
        lines = []
        for step in history[-8:]:  # Last 8 steps to stay within token budget
            lines.append(
                f"Step {step.step_number}: [{step.emotional_state}] "
                f"{step.think_aloud[:80]} → {step.action_type} "
                f"(progress: {step.task_progress}%)"
            )
        return "\n".join(lines)

    @staticmethod
    def _is_stuck(history: list[StepRecord]) -> bool:
        """Detect if the persona is stuck (same URL N consecutive times with no progress)."""
        if len(history) < STUCK_THRESHOLD:
            return False
        recent = history[-STUCK_THRESHOLD:]
        same_url = all(s.page_url == recent[0].page_url for s in recent)
        no_progress = all(
            s.task_progress == recent[0].task_progress for s in recent
        )
        return same_url and no_progress
