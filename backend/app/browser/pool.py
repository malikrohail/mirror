"""Playwright browser pool — per-session Browserbase (cloud) or local fallback."""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from typing import Any

import httpx
from playwright.async_api import Browser, BrowserContext, Playwright, async_playwright

logger = logging.getLogger(__name__)

BB_API_URL = "https://api.browserbase.com/v1"


@dataclass
class ViewportPreset:
    width: int
    height: int
    device_scale_factor: float = 1.0
    is_mobile: bool = False
    has_touch: bool = False
    user_agent: str | None = None


# Standard viewport presets
VIEWPORT_PRESETS: dict[str, ViewportPreset] = {
    "desktop": ViewportPreset(width=1920, height=1080),
    "laptop": ViewportPreset(width=1366, height=768),
    "mobile": ViewportPreset(
        width=390,
        height=844,
        device_scale_factor=3.0,
        is_mobile=True,
        has_touch=True,
        user_agent=(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
            "Mobile/15E148 Safari/604.1"
        ),
    ),
    "tablet": ViewportPreset(
        width=768,
        height=1024,
        device_scale_factor=2.0,
        is_mobile=True,
        has_touch=True,
        user_agent=(
            "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
            "Mobile/15E148 Safari/604.1"
        ),
    ),
}


@dataclass(eq=False)
class BrowserSession:
    """Tracks a single browser session (Browserbase or local context)."""

    context: BrowserContext
    browser: Browser | None = None  # Only set for Browserbase (per-session browser)
    bb_session_id: str | None = None  # Browserbase session ID
    live_view_url: str | None = None  # Live view iframe URL


@dataclass
class BrowserPool:
    """Manages browser sessions — one Browserbase session per persona or local fallback.

    Supports two modes:
    - **Browserbase (cloud)**: Each ``acquire()`` creates a NEW Browserbase session
      via the REST API with ``solveCaptchas: true`` and a unique live-view URL.
    - **Local fallback**: Launches a shared local headless Chromium (for dev/testing).

    Usage::

        pool = BrowserPool(max_contexts=5)
        await pool.initialize()

        session = await pool.acquire(viewport="desktop")
        try:
            page = await session.context.new_page()
            # ... use the page ...
        finally:
            await pool.release(session)

        await pool.shutdown()
    """

    max_contexts: int = 5
    _playwright: Playwright | None = field(default=None, init=False, repr=False)
    _local_browser: Browser | None = field(default=None, init=False, repr=False)
    _semaphore: asyncio.Semaphore = field(init=False, repr=False)
    _active_sessions: set[BrowserSession] = field(
        default_factory=set, init=False, repr=False
    )
    _use_browserbase: bool = field(default=False, init=False, repr=False)
    _bb_api_key: str | None = field(default=None, init=False, repr=False)
    _bb_project_id: str | None = field(default=None, init=False, repr=False)

    def __post_init__(self) -> None:
        self._semaphore = asyncio.Semaphore(self.max_contexts)

    async def initialize(self) -> None:
        """Start Playwright and detect Browserbase or local mode.

        If BROWSERBASE_API_KEY is set, uses per-session Browserbase mode.
        Otherwise, launches a local headless Chromium.
        """
        if self._playwright is not None:
            return

        self._playwright = await async_playwright().start()

        # Use settings (reads .env) with os.getenv as fallback
        from app.config import settings as app_settings

        self._bb_api_key = app_settings.BROWSERBASE_API_KEY or os.getenv(
            "BROWSERBASE_API_KEY"
        )
        self._bb_project_id = app_settings.BROWSERBASE_PROJECT_ID or os.getenv(
            "BROWSERBASE_PROJECT_ID"
        )

        if self._bb_api_key and self._bb_project_id:
            self._use_browserbase = True
            logger.info(
                "BrowserPool: Browserbase mode (project=%s)", self._bb_project_id
            )
        else:
            self._local_browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu",
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ],
            )
            logger.info(
                "BrowserPool: Local Chromium mode (max_contexts=%d)",
                self.max_contexts,
            )

    async def acquire(
        self,
        viewport: str = "desktop",
        extra_args: dict[str, Any] | None = None,
    ) -> BrowserSession:
        """Acquire a browser session.

        Browserbase mode: creates a NEW Browserbase session with its own
        live view URL. Local mode: creates a context on the shared browser.
        Blocks if max_contexts are already in use.
        """
        if self._playwright is None:
            raise RuntimeError("BrowserPool not initialized — call initialize() first")

        await self._semaphore.acquire()

        preset = VIEWPORT_PRESETS.get(viewport, VIEWPORT_PRESETS["desktop"])

        context_args: dict[str, Any] = {
            "viewport": {"width": preset.width, "height": preset.height},
            "device_scale_factor": preset.device_scale_factor,
            "is_mobile": preset.is_mobile,
            "has_touch": preset.has_touch,
            "ignore_https_errors": True,
        }
        if preset.user_agent:
            context_args["user_agent"] = preset.user_agent
        if extra_args:
            context_args.update(extra_args)

        try:
            if self._use_browserbase:
                session = await self._acquire_browserbase(preset, context_args)
            else:
                session = await self._acquire_local(context_args)
        except Exception:
            self._semaphore.release()
            raise

        self._active_sessions.add(session)
        logger.debug(
            "Acquired browser session (viewport=%s, active=%d, cloud=%s)",
            viewport,
            len(self._active_sessions),
            self._use_browserbase,
        )
        return session

    async def _acquire_browserbase(
        self, preset: ViewportPreset, context_args: dict[str, Any]
    ) -> BrowserSession:
        """Create a new Browserbase session and connect Playwright to it."""
        assert self._playwright is not None

        # 1. Create session via REST API. Browserbase returns 201 Created on success.
        max_attempts = 3
        session_data: dict[str, Any] | None = None

        def _retry_wait_seconds(resp: httpx.Response, attempt: int) -> int:
            retry_after = resp.headers.get("Retry-After")
            if retry_after:
                try:
                    return max(int(float(retry_after)), 1)
                except ValueError:
                    pass
            # 5s, 10s, 20s across attempts 1..3.
            return (2 ** (attempt - 1)) * 5

        async with httpx.AsyncClient() as client:
            for attempt in range(1, max_attempts + 1):
                resp = await client.post(
                    f"{BB_API_URL}/sessions",
                    headers={
                        "X-BB-API-Key": self._bb_api_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "projectId": self._bb_project_id,
                        "browserSettings": {
                            "viewport": {
                                "width": preset.width,
                                "height": preset.height,
                            },
                            "solveCaptchas": True,
                            "recordSession": True,
                        },
                    },
                    timeout=30.0,
                )

                if resp.status_code == 429:
                    wait_seconds = _retry_wait_seconds(resp, attempt)
                    if attempt < max_attempts:
                        logger.warning(
                            (
                                "Browserbase session create rate-limited "
                                "(attempt %d/%d); retrying in %ds"
                            ),
                            attempt,
                            max_attempts,
                            wait_seconds,
                        )
                        await asyncio.sleep(wait_seconds)
                        continue
                    logger.error(
                        "Browserbase session create still rate-limited after %d attempts",
                        max_attempts,
                    )
                    break

                resp.raise_for_status()
                session_data = resp.json()
                break

        if session_data is None:
            raise RuntimeError("Browserbase rate limit exceeded after retries")

        bb_session_id = session_data["id"]
        connect_url = session_data["connectUrl"]

        # 2. Connect Playwright via CDP
        browser = await self._playwright.chromium.connect_over_cdp(connect_url)
        # Use the default context (Browserbase creates one for recording)
        if browser.contexts:
            context = browser.contexts[0]
        else:
            context = await browser.new_context(**context_args)

        # 3. Get live view URL (debug endpoint can lag a few seconds after creation).
        live_view_url = await self._fetch_live_view_url(bb_session_id)

        logger.info(
            "Browserbase session created: id=%s, live_view=%s, connect_url=%s",
            bb_session_id,
            bool(live_view_url),
            bool(connect_url),
        )

        return BrowserSession(
            context=context,
            browser=browser,
            bb_session_id=bb_session_id,
            live_view_url=live_view_url,
        )

    async def _fetch_live_view_url(self, bb_session_id: str) -> str | None:
        """Resolve Browserbase debug URL with short retries."""
        max_attempts = 6
        retry_delay_seconds = 1.5

        async with httpx.AsyncClient() as client:
            for attempt in range(1, max_attempts + 1):
                try:
                    resp = await client.get(
                        f"{BB_API_URL}/sessions/{bb_session_id}/debug",
                        headers={"X-BB-API-Key": self._bb_api_key},
                        timeout=10.0,
                    )
                    if resp.status_code in {404, 409, 425, 429}:
                        logger.info(
                            (
                                "[live-view] Debug endpoint not ready: "
                                "session=%s attempt=%d/%d status=%d"
                            ),
                            bb_session_id,
                            attempt,
                            max_attempts,
                            resp.status_code,
                        )
                    else:
                        resp.raise_for_status()
                        debug_data = resp.json()
                        live_view_url = debug_data.get("debuggerFullscreenUrl")
                        if live_view_url:
                            resolved = f"{live_view_url}&navbar=false"
                            logger.info(
                                (
                                    "[live-view] Debug URL resolved: "
                                    "session=%s attempt=%d/%d"
                                ),
                                bb_session_id,
                                attempt,
                                max_attempts,
                            )
                            return resolved
                        logger.info(
                            (
                                "[live-view] Debug endpoint response missing URL: "
                                "session=%s attempt=%d/%d"
                            ),
                            bb_session_id,
                            attempt,
                            max_attempts,
                        )
                except Exception as e:
                    logger.warning(
                        (
                            "[live-view] Debug URL fetch error: "
                            "session=%s attempt=%d/%d error=%s"
                        ),
                        bb_session_id,
                        attempt,
                        max_attempts,
                        e,
                    )

                if attempt < max_attempts:
                    await asyncio.sleep(retry_delay_seconds)

        logger.warning(
            "[live-view] Debug URL unavailable after retries: session=%s attempts=%d",
            bb_session_id,
            max_attempts,
        )
        return None

    async def _acquire_local(self, context_args: dict[str, Any]) -> BrowserSession:
        """Create a local browser context (no live view)."""
        assert self._local_browser is not None
        context = await self._local_browser.new_context(**context_args)
        return BrowserSession(context=context)

    async def release(self, session: BrowserSession) -> None:
        """Release a browser session back to the pool."""
        try:
            await session.context.close()
        except Exception:
            logger.warning("Error closing browser context", exc_info=True)

        # For Browserbase: close the per-session browser and release the session
        if session.browser:
            try:
                await session.browser.close()
            except Exception:
                pass

        if session.bb_session_id:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{BB_API_URL}/sessions/{session.bb_session_id}",
                        headers={
                            "X-BB-API-Key": self._bb_api_key,
                            "Content-Type": "application/json",
                        },
                        json={
                            "projectId": self._bb_project_id,
                            "status": "REQUEST_RELEASE",
                        },
                        timeout=10.0,
                    )
            except Exception as e:
                logger.warning("Failed to release Browserbase session: %s", e)

        self._active_sessions.discard(session)
        self._semaphore.release()
        logger.debug(
            "Released browser session (active=%d)", len(self._active_sessions)
        )

    async def shutdown(self) -> None:
        """Close all sessions and the browser instance."""
        logger.info("Shutting down browser pool")

        for session in list(self._active_sessions):
            try:
                await session.context.close()
            except Exception:
                pass
            if session.browser:
                try:
                    await session.browser.close()
                except Exception:
                    pass
        self._active_sessions.clear()

        if self._local_browser:
            await self._local_browser.close()
            self._local_browser = None

        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

        logger.info("Browser pool shut down")

    @property
    def active_count(self) -> int:
        return len(self._active_sessions)

    @property
    def is_initialized(self) -> bool:
        return self._playwright is not None

    @property
    def is_cloud(self) -> bool:
        return self._use_browserbase
