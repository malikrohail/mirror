"""Tests for the Playwright browser pool."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.browser.pool import BrowserPool, VIEWPORT_PRESETS


class TestViewportPresets:
    """Test viewport preset configuration."""

    def test_desktop_preset_exists(self) -> None:
        assert "desktop" in VIEWPORT_PRESETS
        assert VIEWPORT_PRESETS["desktop"].width == 1920
        assert VIEWPORT_PRESETS["desktop"].height == 1080

    def test_laptop_preset_exists(self) -> None:
        assert "laptop" in VIEWPORT_PRESETS
        assert VIEWPORT_PRESETS["laptop"].width == 1366

    def test_mobile_preset_is_mobile(self) -> None:
        assert "mobile" in VIEWPORT_PRESETS
        preset = VIEWPORT_PRESETS["mobile"]
        assert preset.is_mobile is True
        assert preset.has_touch is True
        assert preset.user_agent is not None

    def test_tablet_preset_is_mobile(self) -> None:
        assert "tablet" in VIEWPORT_PRESETS
        preset = VIEWPORT_PRESETS["tablet"]
        assert preset.is_mobile is True
        assert preset.width == 768


class TestBrowserPool:
    """Test browser pool lifecycle."""

    def test_initial_state(self) -> None:
        pool = BrowserPool(max_contexts=3)
        assert pool.max_contexts == 3
        assert pool.is_initialized is False
        assert pool.active_count == 0

    @pytest.mark.asyncio
    async def test_acquire_without_initialize_raises(self) -> None:
        pool = BrowserPool()
        with pytest.raises(RuntimeError, match="not initialized"):
            await pool.acquire()

    @pytest.mark.asyncio
    async def test_initialize_local_fallback(self) -> None:
        """Test local Chromium launch when Browserbase is not configured."""
        mock_pw = AsyncMock()
        mock_browser = AsyncMock()
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch("app.browser.pool.async_playwright") as mock_apw, \
             patch.dict("os.environ", {}, clear=True):
            mock_apw.return_value.start = AsyncMock(return_value=mock_pw)

            pool = BrowserPool(max_contexts=2)
            await pool.initialize()

            assert pool.is_initialized is True
            assert pool.is_cloud is False
            mock_pw.chromium.launch.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_initialize_browserbase(self) -> None:
        """Test Browserbase CDP connection when env vars are set."""
        mock_pw = AsyncMock()
        mock_browser = AsyncMock()
        mock_pw.chromium.connect_over_cdp = AsyncMock(return_value=mock_browser)

        with patch("app.browser.pool.async_playwright") as mock_apw, \
             patch.dict("os.environ", {
                 "BROWSERBASE_API_KEY": "bb_test_key",
                 "BROWSERBASE_PROJECT_ID": "proj_test",
             }):
            mock_apw.return_value.start = AsyncMock(return_value=mock_pw)

            pool = BrowserPool(max_contexts=2)
            await pool.initialize()

            assert pool.is_initialized is True
            assert pool.is_cloud is True
            mock_pw.chromium.connect_over_cdp.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_acquire_and_release(self) -> None:
        """Test acquiring and releasing a browser context."""
        mock_pw = AsyncMock()
        mock_browser = AsyncMock()
        mock_context = AsyncMock()
        mock_browser.new_context = AsyncMock(return_value=mock_context)
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch("app.browser.pool.async_playwright") as mock_apw, \
             patch.dict("os.environ", {}, clear=True):
            mock_apw.return_value.start = AsyncMock(return_value=mock_pw)

            pool = BrowserPool(max_contexts=2)
            await pool.initialize()

            ctx = await pool.acquire(viewport="desktop")
            assert pool.active_count == 1

            await pool.release(ctx)
            assert pool.active_count == 0

    @pytest.mark.asyncio
    async def test_acquire_with_mobile_viewport(self) -> None:
        """Test that mobile viewport config is passed correctly."""
        mock_pw = AsyncMock()
        mock_browser = AsyncMock()
        mock_context = AsyncMock()
        mock_browser.new_context = AsyncMock(return_value=mock_context)
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch("app.browser.pool.async_playwright") as mock_apw, \
             patch.dict("os.environ", {}, clear=True):
            mock_apw.return_value.start = AsyncMock(return_value=mock_pw)

            pool = BrowserPool(max_contexts=2)
            await pool.initialize()

            await pool.acquire(viewport="mobile")

            # Check that mobile viewport was passed
            call_kwargs = mock_browser.new_context.call_args[1]
            assert call_kwargs["viewport"]["width"] == 390
            assert call_kwargs["is_mobile"] is True
            assert call_kwargs["has_touch"] is True

    @pytest.mark.asyncio
    async def test_shutdown_cleans_up(self) -> None:
        """Test that shutdown closes all contexts and the browser."""
        mock_pw = AsyncMock()
        mock_browser = AsyncMock()
        mock_context = AsyncMock()
        mock_browser.new_context = AsyncMock(return_value=mock_context)
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch("app.browser.pool.async_playwright") as mock_apw, \
             patch.dict("os.environ", {}, clear=True):
            mock_apw.return_value.start = AsyncMock(return_value=mock_pw)

            pool = BrowserPool(max_contexts=2)
            await pool.initialize()

            await pool.acquire(viewport="desktop")
            assert pool.active_count == 1

            await pool.shutdown()
            assert pool.is_initialized is False
            assert pool.active_count == 0
            mock_browser.close.assert_awaited_once()
            mock_pw.stop.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_double_initialize_is_noop(self) -> None:
        """Test that calling initialize twice doesn't launch a second browser."""
        mock_pw = AsyncMock()
        mock_browser = AsyncMock()
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch("app.browser.pool.async_playwright") as mock_apw, \
             patch.dict("os.environ", {}, clear=True):
            mock_apw.return_value.start = AsyncMock(return_value=mock_pw)

            pool = BrowserPool()
            await pool.initialize()
            await pool.initialize()  # Should be a no-op

            assert mock_pw.chromium.launch.await_count == 1
