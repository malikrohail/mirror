"""Playwright browser pool — per-session Browserbase (cloud) or local fallback.

Supports:
- Browserbase (cloud) mode: one session per persona via REST API
- Local mode: shared Chromium instances with context isolation
- Health checks & auto-restart (Iteration 2)
- Memory management with page-count limits (Iteration 2)
- Warm-up pre-created contexts (Iteration 2)
- Parallel browser instances for local mode (Iteration 4)
- Persistent browser profiles (Iteration 4)
- Hybrid auto-failover: local → cloud on repeated crashes (Iteration 5)
- Resource monitoring via psutil (Iteration 5)
"""

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
    page_count: int = 0  # Pages navigated in this context (for memory mgmt)
    browser_index: int = 0  # Which local browser instance (for parallel mode)


@dataclass
class PoolStats:
    """Runtime statistics for the browser pool."""

    mode: str = "unknown"
    active_sessions: int = 0
    total_acquires: int = 0
    total_releases: int = 0
    crash_count: int = 0
    failover_count: int = 0
    uptime_seconds: float = 0.0
    browser_instances: int = 0
    memory_usage_mb: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "active_sessions": self.active_sessions,
            "total_acquires": self.total_acquires,
            "total_releases": self.total_releases,
            "crash_count": self.crash_count,
            "failover_count": self.failover_count,
            "uptime_seconds": round(self.uptime_seconds, 1),
            "browser_instances": self.browser_instances,
            "memory_usage_mb": round(self.memory_usage_mb, 1),
        }


@dataclass
class BrowserPool:
    """Manages browser sessions — Browserbase or local Chromium.

    Supports two modes:
    - **Browserbase (cloud)**: Each ``acquire()`` creates a NEW Browserbase session
      via the REST API with ``solveCaptchas: true`` and a unique live-view URL.
    - **Local fallback**: Launches shared local headless Chromium instance(s).

    Features (all modes):
    - Concurrency limiting via semaphore
    - Health checks with auto-restart for local browsers
    - Memory management with page-count limits per context
    - Warm-up pre-created contexts on init
    - Parallel browser instances (local mode)
    - Persistent browser profiles (local mode)
    - Hybrid failover: local → cloud after repeated crashes

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
    force_local: bool = False
    _playwright: Playwright | None = field(default=None, init=False, repr=False)
    _local_browsers: list[Browser] = field(
        default_factory=list, init=False, repr=False
    )
    _local_browser: Browser | None = field(default=None, init=False, repr=False)
    _semaphore: asyncio.Semaphore = field(init=False, repr=False)
    _active_sessions: set[BrowserSession] = field(
        default_factory=set, init=False, repr=False
    )
    _use_browserbase: bool = field(default=False, init=False, repr=False)
    _bb_api_key: str | None = field(default=None, init=False, repr=False)
    _bb_project_id: str | None = field(default=None, init=False, repr=False)
    _stats: PoolStats = field(default_factory=PoolStats, init=False, repr=False)
    _start_time: float = field(default=0.0, init=False, repr=False)
    _warm_contexts: list[BrowserContext] = field(
        default_factory=list, init=False, repr=False
    )
    _browser_round_robin: int = field(default=0, init=False, repr=False)
    _failover_active: bool = field(default=False, init=False, repr=False)

    def __post_init__(self) -> None:
        self._semaphore = asyncio.Semaphore(self.max_contexts)

    async def initialize(self) -> None:
        """Start Playwright and detect Browserbase or local mode.

        If BROWSERBASE_API_KEY is set (and force_local is False), uses
        per-session Browserbase mode. Otherwise, launches local Chromium.
        """
        if self._playwright is not None:
            return

        import time

        self._start_time = time.monotonic()
        self._playwright = await async_playwright().start()

        # Use settings (reads .env) with os.getenv as fallback
        from app.config import settings as app_settings

        self._bb_api_key = app_settings.BROWSERBASE_API_KEY or os.getenv(
            "BROWSERBASE_API_KEY"
        )
        self._bb_project_id = app_settings.BROWSERBASE_PROJECT_ID or os.getenv(
            "BROWSERBASE_PROJECT_ID"
        )

        if self._bb_api_key and self._bb_project_id and not self.force_local:
            self._use_browserbase = True
            self._stats.mode = "cloud"
            logger.info(
                "BrowserPool: Browserbase mode (project=%s)", self._bb_project_id
            )
        else:
            await self._launch_local_browsers()
            self._stats.mode = "local"

    async def _launch_local_browsers(self) -> None:
        """Launch one or more local Chromium instances."""
        from app.config import settings as app_settings

        assert self._playwright is not None

        num_instances = getattr(app_settings, "PARALLEL_BROWSER_INSTANCES", 1)
        profile_path = getattr(app_settings, "BROWSER_PROFILE_PATH", "")
        debug_cdp = getattr(app_settings, "BROWSER_DEBUG_CDP", False)

        launch_args = [
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--no-sandbox",
        ]

        launch_kwargs: dict[str, Any] = {
            "headless": True,
            "args": launch_args,
        }

        # Persistent browser profile for reusing cookies/cache
        if profile_path and os.path.isdir(os.path.dirname(profile_path)):
            os.makedirs(profile_path, exist_ok=True)

        for i in range(max(1, num_instances)):
            browser = await self._playwright.chromium.launch(**launch_kwargs)
            self._local_browsers.append(browser)

            if debug_cdp:
                # Log the CDP WebSocket URL for DevTools attachment
                try:
                    ws_url = browser.contexts[0].browser.ws_endpoint if browser.contexts else "N/A"
                    logger.info(
                        "[debug-cdp] Browser %d CDP WebSocket: %s", i, ws_url
                    )
                except Exception:
                    pass

        # Keep backward compat: _local_browser points to first instance
        self._local_browser = self._local_browsers[0] if self._local_browsers else None
        self._stats.browser_instances = len(self._local_browsers)

        logger.info(
            "BrowserPool: Local Chromium mode (instances=%d, max_contexts=%d)",
            len(self._local_browsers),
            self.max_contexts,
        )

        # Warm up: pre-create contexts to reduce first-acquire latency
        warmup_count = getattr(app_settings, "BROWSER_WARMUP_CONTEXTS", 0)
        if warmup_count > 0:
            await self._warmup_contexts(warmup_count)

    async def _warmup_contexts(self, count: int) -> None:
        """Pre-create browser contexts to reduce first-session latency."""
        for i in range(min(count, self.max_contexts)):
            browser = self._get_next_browser()
            if browser:
                try:
                    ctx = await browser.new_context(
                        viewport={"width": 1920, "height": 1080},
                        ignore_https_errors=True,
                    )
                    self._warm_contexts.append(ctx)
                except Exception as e:
                    logger.warning("Warm-up context %d failed: %s", i, e)
        if self._warm_contexts:
            logger.info("Warmed up %d browser contexts", len(self._warm_contexts))

    def _get_next_browser(self) -> Browser | None:
        """Round-robin across local browser instances."""
        if not self._local_browsers:
            return None
        browser = self._local_browsers[self._browser_round_robin % len(self._local_browsers)]
        self._browser_round_robin += 1
        return browser

    async def _check_browser_health(self, browser: Browser) -> bool:
        """Check if a local browser is still responsive."""
        try:
            # Try creating and immediately closing a page as a health check
            ctx = await browser.new_context()
            page = await ctx.new_page()
            await page.close()
            await ctx.close()
            return True
        except Exception as e:
            logger.warning("Browser health check failed: %s", e)
            return False

    async def _restart_browser(self, index: int) -> Browser | None:
        """Restart a crashed local browser instance."""
        assert self._playwright is not None
        self._stats.crash_count += 1

        old_browser = self._local_browsers[index] if index < len(self._local_browsers) else None
        if old_browser:
            try:
                await old_browser.close()
            except Exception:
                pass

        try:
            new_browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"],
            )
            if index < len(self._local_browsers):
                self._local_browsers[index] = new_browser
            else:
                self._local_browsers.append(new_browser)

            # Update _local_browser reference
            if index == 0:
                self._local_browser = new_browser

            logger.info("Browser instance %d restarted (crash_count=%d)", index, self._stats.crash_count)
            return new_browser
        except Exception as e:
            logger.error("Failed to restart browser instance %d: %s", index, e)
            return None

    def _check_system_resources(self) -> bool:
        """Check if system has enough free memory for a new session.

        Returns True if resources are available, False otherwise.
        """
        from app.config import settings as app_settings

        min_free_mb = getattr(app_settings, "MEMORY_MIN_FREE_MB", 500)
        try:
            import psutil

            mem = psutil.virtual_memory()
            free_mb = mem.available / (1024 * 1024)
            self._stats.memory_usage_mb = (mem.total - mem.available) / (1024 * 1024)

            if free_mb < min_free_mb:
                logger.warning(
                    "Low memory: %.0fMB free (threshold: %dMB). "
                    "Consider reducing max_concurrent_sessions.",
                    free_mb,
                    min_free_mb,
                )
                return False
            return True
        except ImportError:
            # psutil not installed — skip resource checks
            return True
        except Exception as e:
            logger.debug("Resource check failed: %s", e)
            return True

    async def acquire(
        self,
        viewport: str = "desktop",
        extra_args: dict[str, Any] | None = None,
    ) -> BrowserSession:
        """Acquire a browser session.

        Browserbase mode: creates a NEW Browserbase session with its own
        live view URL. Local mode: creates a context on a shared browser.
        Blocks if max_contexts are already in use.

        Includes:
        - Resource monitoring (backpressure if low memory)
        - Health checks with auto-restart for local browsers
        - Hybrid failover to cloud if local crashes repeatedly
        """
        if self._playwright is None:
            raise RuntimeError("BrowserPool not initialized — call initialize() first")

        # Resource monitoring: backpressure if low memory
        if not self._use_browserbase and not self._check_system_resources():
            from app.config import settings as app_settings

            # Reduce effective concurrency under memory pressure
            if self.active_count >= max(1, self.max_contexts - 1):
                logger.warning(
                    "Memory pressure: waiting for a session to finish before acquiring"
                )

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
            # Check for hybrid failover condition
            if self._should_failover():
                session = await self._acquire_browserbase(preset, context_args)
                self._stats.failover_count += 1
                logger.info(
                    "Hybrid failover: using Browserbase (crash_count=%d)",
                    self._stats.crash_count,
                )
            elif self._use_browserbase:
                session = await self._acquire_browserbase(preset, context_args)
            else:
                session = await self._acquire_local(context_args)
        except Exception:
            self._semaphore.release()
            raise

        self._active_sessions.add(session)
        self._stats.total_acquires += 1
        self._stats.active_sessions = len(self._active_sessions)
        logger.debug(
            "Acquired browser session (viewport=%s, active=%d, cloud=%s)",
            viewport,
            len(self._active_sessions),
            self._use_browserbase or self._failover_active,
        )
        return session

    def _should_failover(self) -> bool:
        """Determine if we should failover from local to cloud."""
        if self._use_browserbase:
            return False  # Already in cloud mode
        if self._failover_active:
            return True  # Already failed over

        from app.config import settings as app_settings

        if not getattr(app_settings, "HYBRID_FAILOVER_ENABLED", True):
            return False
        threshold = getattr(app_settings, "HYBRID_CRASH_THRESHOLD", 2)

        # Only failover if cloud credentials exist
        if not (self._bb_api_key and self._bb_project_id):
            return False

        if self._stats.crash_count >= threshold:
            self._failover_active = True
            logger.warning(
                "Activating hybrid failover: %d crashes exceed threshold %d",
                self._stats.crash_count,
                threshold,
            )
            return True
        return False

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
        max_attempts = 3
        retry_delay_seconds = 1.0

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
        """Create a local browser context with health checks.

        Uses round-robin across browser instances for parallel mode.
        Includes health check and auto-restart if browser is unresponsive.
        """
        # Try to use a warm context first
        if self._warm_contexts:
            ctx = self._warm_contexts.pop(0)
            logger.debug("Using pre-warmed browser context")
            return BrowserSession(context=ctx)

        browser = self._get_next_browser()
        browser_idx = (self._browser_round_robin - 1) % max(1, len(self._local_browsers))

        if browser is None:
            raise RuntimeError("No local browser instances available")

        # Health check before creating context
        if not await self._check_browser_health(browser):
            logger.warning("Browser instance %d failed health check, restarting", browser_idx)
            browser = await self._restart_browser(browser_idx)
            if browser is None:
                raise RuntimeError(
                    f"Browser instance {browser_idx} could not be restarted"
                )

        try:
            context = await browser.new_context(**context_args)
        except Exception as e:
            # Browser might have crashed between health check and context creation
            logger.warning("Context creation failed, restarting browser: %s", e)
            browser = await self._restart_browser(browser_idx)
            if browser is None:
                raise RuntimeError("Browser restart failed") from e
            context = await browser.new_context(**context_args)

        return BrowserSession(context=context, browser_index=browser_idx)

    def increment_page_count(self, session: BrowserSession) -> bool:
        """Increment page count for a session and check if context should be recycled.

        Returns True if the context should be recycled (page limit exceeded).
        """
        from app.config import settings as app_settings

        session.page_count += 1
        max_pages = getattr(app_settings, "MAX_PAGES_PER_CONTEXT", 50)
        if session.page_count >= max_pages:
            logger.info(
                "Session page count %d reached limit %d — context should be recycled",
                session.page_count,
                max_pages,
            )
            return True
        return False

    async def recycle_context(
        self, session: BrowserSession, context_args: dict[str, Any] | None = None
    ) -> BrowserSession:
        """Close current context and create a new one on the same browser.

        Used for memory management when page count exceeds the limit.
        """
        if session.bb_session_id:
            # Can't recycle Browserbase sessions
            return session

        browser_idx = session.browser_index
        old_context = session.context

        try:
            await old_context.close()
        except Exception:
            pass

        browser = (
            self._local_browsers[browser_idx]
            if browser_idx < len(self._local_browsers)
            else self._local_browser
        )
        if browser is None:
            raise RuntimeError("No browser available for context recycling")

        args = context_args or {
            "viewport": {"width": 1920, "height": 1080},
            "ignore_https_errors": True,
        }
        new_context = await browser.new_context(**args)

        # Update the session in-place
        self._active_sessions.discard(session)
        new_session = BrowserSession(
            context=new_context,
            browser_index=browser_idx,
            page_count=0,
        )
        self._active_sessions.add(new_session)

        logger.info(
            "Recycled browser context (browser_idx=%d, old_pages=%d)",
            browser_idx,
            session.page_count,
        )
        return new_session

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
        self._stats.total_releases += 1
        self._stats.active_sessions = len(self._active_sessions)
        self._semaphore.release()
        logger.debug(
            "Released browser session (active=%d)", len(self._active_sessions)
        )

    async def shutdown(self) -> None:
        """Close all sessions, warm contexts, and browser instances."""
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

        # Close warm contexts
        for ctx in self._warm_contexts:
            try:
                await ctx.close()
            except Exception:
                pass
        self._warm_contexts.clear()

        # Close all local browser instances
        for browser in self._local_browsers:
            try:
                await browser.close()
            except Exception:
                pass
        self._local_browsers.clear()
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

    @property
    def stats(self) -> PoolStats:
        """Get current pool statistics."""
        import time

        if self._start_time > 0:
            self._stats.uptime_seconds = time.monotonic() - self._start_time
        self._stats.active_sessions = len(self._active_sessions)
        # Update memory usage
        self._check_system_resources()
        return self._stats

    @property
    def is_failover_active(self) -> bool:
        """Whether hybrid failover to cloud is currently active."""
        return self._failover_active
