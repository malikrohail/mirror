"""Playwright browser pool — manages headless browsers via Browserbase (cloud) or local."""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from typing import Any

from playwright.async_api import Browser, BrowserContext, Playwright, async_playwright

logger = logging.getLogger(__name__)


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


@dataclass
class BrowserPool:
    """Manages a pool of Playwright browser contexts.

    Supports two modes:
    - **Browserbase (cloud)**: Connects via CDP to Browserbase-managed browsers.
      Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID env vars.
    - **Local fallback**: Launches a local headless Chromium (for dev/testing).

    Usage::

        pool = BrowserPool(max_contexts=5)
        await pool.initialize()

        ctx = await pool.acquire(viewport="desktop")
        try:
            page = await ctx.new_page()
            # ... use the page ...
        finally:
            await pool.release(ctx)

        await pool.shutdown()
    """

    max_contexts: int = 5
    _playwright: Playwright | None = field(default=None, init=False, repr=False)
    _browser: Browser | None = field(default=None, init=False, repr=False)
    _semaphore: asyncio.Semaphore = field(init=False, repr=False)
    _active_contexts: set[BrowserContext] = field(
        default_factory=set, init=False, repr=False
    )
    _use_browserbase: bool = field(default=False, init=False, repr=False)

    def __post_init__(self) -> None:
        self._semaphore = asyncio.Semaphore(self.max_contexts)

    async def initialize(self) -> None:
        """Launch or connect to the browser.

        If BROWSERBASE_API_KEY is set, connects to Browserbase via CDP.
        Otherwise, launches a local headless Chromium.
        """
        if self._browser is not None:
            return

        self._playwright = await async_playwright().start()

        bb_api_key = os.getenv("BROWSERBASE_API_KEY")
        bb_project_id = os.getenv("BROWSERBASE_PROJECT_ID")

        if bb_api_key and bb_project_id:
            await self._connect_browserbase(bb_api_key, bb_project_id)
        else:
            await self._launch_local()

    async def _connect_browserbase(self, api_key: str, project_id: str) -> None:
        """Connect to Browserbase cloud browser via CDP."""
        assert self._playwright is not None

        # Browserbase provides a CDP endpoint we connect to
        cdp_url = (
            f"wss://connect.browserbase.com"
            f"?apiKey={api_key}&projectId={project_id}"
        )
        logger.info("Connecting to Browserbase (project=%s)", project_id)
        self._browser = await self._playwright.chromium.connect_over_cdp(cdp_url)
        self._use_browserbase = True
        logger.info("Connected to Browserbase")

    async def _launch_local(self) -> None:
        """Launch a local headless Chromium for development."""
        assert self._playwright is not None

        logger.info(
            "Browserbase not configured — launching local Chromium (max_contexts=%d)",
            self.max_contexts,
        )
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--no-sandbox",
            ],
        )
        logger.info("Local browser pool initialized")

    async def acquire(
        self,
        viewport: str = "desktop",
        extra_args: dict[str, Any] | None = None,
    ) -> BrowserContext:
        """Acquire a browser context from the pool.

        Blocks if max_contexts are already in use.
        """
        if self._browser is None:
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
            ctx = await self._browser.new_context(**context_args)
        except Exception:
            self._semaphore.release()
            raise

        self._active_contexts.add(ctx)
        logger.debug(
            "Acquired browser context (viewport=%s, active=%d, cloud=%s)",
            viewport,
            len(self._active_contexts),
            self._use_browserbase,
        )
        return ctx

    async def release(self, ctx: BrowserContext) -> None:
        """Release a browser context back to the pool."""
        try:
            await ctx.close()
        except Exception:
            logger.warning("Error closing browser context", exc_info=True)
        finally:
            self._active_contexts.discard(ctx)
            self._semaphore.release()
            logger.debug(
                "Released browser context (active=%d)", len(self._active_contexts)
            )

    async def shutdown(self) -> None:
        """Close all contexts and the browser instance."""
        logger.info("Shutting down browser pool")

        for ctx in list(self._active_contexts):
            try:
                await ctx.close()
            except Exception:
                pass
        self._active_contexts.clear()

        if self._browser:
            await self._browser.close()
            self._browser = None

        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

        logger.info("Browser pool shut down")

    @property
    def active_count(self) -> int:
        return len(self._active_contexts)

    @property
    def is_initialized(self) -> bool:
        return self._browser is not None

    @property
    def is_cloud(self) -> bool:
        return self._use_browserbase
