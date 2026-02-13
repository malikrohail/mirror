"""Tests for the Playwright browser pool."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.browser.pool import VIEWPORT_PRESETS, BrowserPool, BrowserSession


def _mock_http_response(
    status_code: int,
    payload: dict | None = None,
    headers: dict | None = None,
) -> MagicMock:
    """Build a minimal httpx-like response object for unit tests."""
    response = MagicMock()
    response.status_code = status_code
    response.headers = headers or {}
    response.json.return_value = payload or {}
    if status_code >= 400:
        response.raise_for_status.side_effect = httpx.HTTPStatusError(
            message=f"HTTP {status_code}",
            request=MagicMock(),
            response=response,
        )
    else:
        response.raise_for_status.return_value = None
    return response


@pytest.fixture(autouse=True)
def _clear_browserbase_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Prevent local .env Browserbase keys from leaking into unit tests."""
    from app.config import settings as app_settings

    monkeypatch.setattr(app_settings, "BROWSERBASE_API_KEY", "")
    monkeypatch.setattr(app_settings, "BROWSERBASE_PROJECT_ID", "")


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
        """Test Browserbase mode detection when env vars are set."""
        mock_pw = AsyncMock()

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
            # In per-session mode, no CDP connection at init time
            mock_pw.chromium.launch.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_force_local_overrides_browserbase(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """When force_local=True, local Chromium is used even if Browserbase credentials are set."""
        from app.config import settings as app_settings

        monkeypatch.setattr(app_settings, "BROWSERBASE_API_KEY", "bb_test_key")
        monkeypatch.setattr(app_settings, "BROWSERBASE_PROJECT_ID", "proj_test")

        mock_pw = AsyncMock()
        mock_browser = AsyncMock()
        mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)

        with patch("app.browser.pool.async_playwright") as mock_apw, \
             patch.dict("os.environ", {
                 "BROWSERBASE_API_KEY": "bb_test_key",
                 "BROWSERBASE_PROJECT_ID": "proj_test",
             }):
            mock_apw.return_value.start = AsyncMock(return_value=mock_pw)

            pool = BrowserPool(max_contexts=2, force_local=True)
            await pool.initialize()

            assert pool.is_initialized is True
            assert pool.is_cloud is False
            mock_pw.chromium.launch.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_acquire_and_release(self) -> None:
        """Test acquiring and releasing a browser session."""
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

            session = await pool.acquire(viewport="desktop")
            assert isinstance(session, BrowserSession)
            assert session.live_view_url is None  # Local mode has no live view
            assert pool.active_count == 1

            await pool.release(session)
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

    @pytest.mark.asyncio
    async def test_browserbase_acquire_retries_on_429_then_succeeds(self) -> None:
        """Test Browserbase session creation retries on 429 responses."""
        mock_pw = AsyncMock()
        mock_context = AsyncMock()
        mock_browser = AsyncMock()
        mock_browser.contexts = [mock_context]
        mock_pw.chromium.connect_over_cdp = AsyncMock(return_value=mock_browser)

        pool = BrowserPool()
        pool._playwright = mock_pw
        pool._bb_api_key = "bb_test_key"
        pool._bb_project_id = "proj_test"

        first_429 = _mock_http_response(429, headers={"Retry-After": "1"})
        second_201 = _mock_http_response(
            201,
            payload={"id": "sess_1", "connectUrl": "wss://connect.example"},
        )
        debug_200 = _mock_http_response(
            200, payload={"debuggerFullscreenUrl": "https://debug.example/live"}
        )

        post_mock = AsyncMock(side_effect=[first_429, second_201])
        get_mock = AsyncMock(return_value=debug_200)
        mock_client = AsyncMock()
        mock_client.post = post_mock
        mock_client.get = get_mock
        mock_client_ctx = AsyncMock()
        mock_client_ctx.__aenter__.return_value = mock_client
        mock_client_ctx.__aexit__.return_value = None

        with patch("app.browser.pool.httpx.AsyncClient", return_value=mock_client_ctx), \
             patch("app.browser.pool.asyncio.sleep", new_callable=AsyncMock) as sleep_mock:
            session = await pool._acquire_browserbase(
                VIEWPORT_PRESETS["desktop"],
                {"viewport": {"width": 1920, "height": 1080}},
            )

        assert isinstance(session, BrowserSession)
        assert session.bb_session_id == "sess_1"
        assert session.live_view_url == "https://debug.example/live&navbar=false"
        assert post_mock.await_count == 2
        sleep_mock.assert_awaited_once_with(1)

    @pytest.mark.asyncio
    async def test_browserbase_acquire_raises_after_429_retries_exhausted(self) -> None:
        """Test Browserbase session creation fails after max retry attempts."""
        mock_pw = AsyncMock()
        pool = BrowserPool()
        pool._playwright = mock_pw
        pool._bb_api_key = "bb_test_key"
        pool._bb_project_id = "proj_test"

        all_429 = _mock_http_response(429)
        post_mock = AsyncMock(side_effect=[all_429, all_429, all_429])
        mock_client = AsyncMock()
        mock_client.post = post_mock
        mock_client_ctx = AsyncMock()
        mock_client_ctx.__aenter__.return_value = mock_client
        mock_client_ctx.__aexit__.return_value = None

        with patch("app.browser.pool.httpx.AsyncClient", return_value=mock_client_ctx), \
             patch("app.browser.pool.asyncio.sleep", new_callable=AsyncMock) as sleep_mock:
            with pytest.raises(RuntimeError, match="rate limit exceeded"):
                await pool._acquire_browserbase(
                    VIEWPORT_PRESETS["desktop"],
                    {"viewport": {"width": 1920, "height": 1080}},
                )

        assert post_mock.await_count == 3
        assert sleep_mock.await_count == 2

    @pytest.mark.asyncio
    async def test_fetch_live_view_url_retries_until_available(self) -> None:
        """Debug URL fetch should retry while Browserbase session is warming up."""
        pool = BrowserPool()
        pool._bb_api_key = "bb_test_key"

        not_ready = _mock_http_response(404)
        missing_url = _mock_http_response(200, payload={})
        ready = _mock_http_response(
            200,
            payload={"debuggerFullscreenUrl": "https://debug.example/live"},
        )

        get_mock = AsyncMock(side_effect=[not_ready, missing_url, ready])
        mock_client = AsyncMock()
        mock_client.get = get_mock
        mock_client_ctx = AsyncMock()
        mock_client_ctx.__aenter__.return_value = mock_client
        mock_client_ctx.__aexit__.return_value = None

        with patch("app.browser.pool.httpx.AsyncClient", return_value=mock_client_ctx), \
             patch("app.browser.pool.asyncio.sleep", new_callable=AsyncMock) as sleep_mock:
            live_view_url = await pool._fetch_live_view_url("sess_1")

        assert live_view_url == "https://debug.example/live&navbar=false"
        assert get_mock.await_count == 3
        assert sleep_mock.await_count == 2

    @pytest.mark.asyncio
    async def test_fetch_live_view_url_returns_none_after_retry_limit(self) -> None:
        """Debug URL fetch returns None when endpoint never becomes ready."""
        pool = BrowserPool()
        pool._bb_api_key = "bb_test_key"

        not_ready = _mock_http_response(404)
        get_mock = AsyncMock(side_effect=[not_ready] * 6)
        mock_client = AsyncMock()
        mock_client.get = get_mock
        mock_client_ctx = AsyncMock()
        mock_client_ctx.__aenter__.return_value = mock_client
        mock_client_ctx.__aexit__.return_value = None

        with patch("app.browser.pool.httpx.AsyncClient", return_value=mock_client_ctx), \
             patch("app.browser.pool.asyncio.sleep", new_callable=AsyncMock) as sleep_mock:
            live_view_url = await pool._fetch_live_view_url("sess_2")

        assert live_view_url is None
        assert get_mock.await_count == 6
        assert sleep_mock.await_count == 5


class TestBrowserPoolIteration2:
    """Tests for Iteration 2 features: health checks, memory mgmt, warm-up."""

    @pytest.mark.asyncio
    async def test_health_check_passes_for_healthy_browser(self) -> None:
        """Health check returns True for a responsive browser."""
        mock_browser = AsyncMock()
        mock_ctx = AsyncMock()
        mock_page = AsyncMock()
        mock_browser.new_context = AsyncMock(return_value=mock_ctx)
        mock_ctx.new_page = AsyncMock(return_value=mock_page)

        pool = BrowserPool()
        result = await pool._check_browser_health(mock_browser)
        assert result is True

    @pytest.mark.asyncio
    async def test_health_check_fails_for_crashed_browser(self) -> None:
        """Health check returns False when browser can't create a context."""
        mock_browser = AsyncMock()
        mock_browser.new_context = AsyncMock(
            side_effect=Exception("Browser process crashed")
        )

        pool = BrowserPool()
        result = await pool._check_browser_health(mock_browser)
        assert result is False

    @pytest.mark.asyncio
    async def test_restart_browser_increments_crash_count(self) -> None:
        """Restarting a browser increments the crash counter."""
        mock_pw = AsyncMock()
        mock_new_browser = AsyncMock()
        mock_pw.chromium.launch = AsyncMock(return_value=mock_new_browser)

        pool = BrowserPool()
        pool._playwright = mock_pw
        pool._local_browsers = [AsyncMock()]

        await pool._restart_browser(0)

        assert pool._stats.crash_count == 1
        assert pool._local_browsers[0] is mock_new_browser

    def test_page_count_tracking(self) -> None:
        """increment_page_count tracks pages and signals recycling."""
        pool = BrowserPool()
        session = BrowserSession(context=AsyncMock(), page_count=0)

        # Under limit
        with patch("app.config.settings") as mock_settings:
            mock_settings.MAX_PAGES_PER_CONTEXT = 5
            for _ in range(4):
                assert pool.increment_page_count(session) is False
            # At limit
            assert pool.increment_page_count(session) is True

    def test_pool_stats_to_dict(self) -> None:
        """PoolStats serializes correctly."""
        from app.browser.pool import PoolStats

        stats = PoolStats(
            mode="local",
            active_sessions=2,
            crash_count=1,
            uptime_seconds=123.456,
        )
        d = stats.to_dict()
        assert d["mode"] == "local"
        assert d["active_sessions"] == 2
        assert d["crash_count"] == 1
        assert d["uptime_seconds"] == 123.5


class TestBrowserPoolIteration5:
    """Tests for Iteration 5 features: failover, resource monitoring."""

    def test_failover_not_triggered_below_threshold(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Failover should not activate when crash count is below threshold."""
        from app.config import settings as app_settings

        monkeypatch.setattr(app_settings, "HYBRID_FAILOVER_ENABLED", True)
        monkeypatch.setattr(app_settings, "HYBRID_CRASH_THRESHOLD", 3)

        pool = BrowserPool()
        pool._bb_api_key = "bb_test"
        pool._bb_project_id = "proj_test"
        pool._stats.crash_count = 2

        assert pool._should_failover() is False

    def test_failover_triggered_at_threshold(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Failover should activate when crash count reaches threshold."""
        from app.config import settings as app_settings

        monkeypatch.setattr(app_settings, "HYBRID_FAILOVER_ENABLED", True)
        monkeypatch.setattr(app_settings, "HYBRID_CRASH_THRESHOLD", 2)

        pool = BrowserPool()
        pool._bb_api_key = "bb_test"
        pool._bb_project_id = "proj_test"
        pool._stats.crash_count = 2

        assert pool._should_failover() is True
        assert pool._failover_active is True

    def test_failover_requires_cloud_credentials(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Failover should not activate without Browserbase credentials."""
        from app.config import settings as app_settings

        monkeypatch.setattr(app_settings, "HYBRID_FAILOVER_ENABLED", True)
        monkeypatch.setattr(app_settings, "HYBRID_CRASH_THRESHOLD", 1)

        pool = BrowserPool()
        pool._bb_api_key = None  # No credentials
        pool._bb_project_id = None
        pool._stats.crash_count = 5

        assert pool._should_failover() is False

    def test_failover_disabled_by_config(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Failover should not activate when disabled in config."""
        from app.config import settings as app_settings

        monkeypatch.setattr(app_settings, "HYBRID_FAILOVER_ENABLED", False)

        pool = BrowserPool()
        pool._bb_api_key = "bb_test"
        pool._bb_project_id = "proj_test"
        pool._stats.crash_count = 10

        assert pool._should_failover() is False
