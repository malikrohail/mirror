"""Tests for CDPScreencastManager."""

from __future__ import annotations

import asyncio
import base64
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.browser.screencast import CDPScreencastManager


@pytest.fixture
def mock_cdp_session():
    """Create a mock CDP session."""
    cdp = AsyncMock()
    cdp.send = AsyncMock()
    cdp.detach = AsyncMock()
    cdp.on = MagicMock()
    return cdp


@pytest.fixture
def mock_page(mock_cdp_session):
    """Create a mock Playwright page whose context yields our mock CDP session."""
    page = AsyncMock()
    page.context = AsyncMock()
    page.context.new_cdp_session = AsyncMock(return_value=mock_cdp_session)
    return page


@pytest.fixture
def mock_redis():
    """Create a mock binary Redis connection."""
    redis = AsyncMock()
    redis.publish = AsyncMock()
    return redis


@pytest.fixture
def session_id():
    return "550e8400-e29b-41d4-a716-446655440000"


@pytest.fixture
def manager(session_id):
    return CDPScreencastManager(
        session_id=session_id,
        quality=60,
        max_width=1280,
        every_nth_frame=6,
    )


class TestCDPScreencastManagerStart:
    """Test starting the screencast."""

    @pytest.mark.asyncio
    async def test_start_creates_cdp_session(
        self, manager, mock_page, mock_cdp_session, mock_redis
    ):
        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)

        mock_page.context.new_cdp_session.assert_awaited_once_with(mock_page)
        assert manager.is_running

    @pytest.mark.asyncio
    async def test_start_sends_start_screencast(
        self, manager, mock_page, mock_cdp_session, mock_redis
    ):
        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)

        mock_cdp_session.send.assert_awaited_once_with(
            "Page.startScreencast",
            {
                "format": "jpeg",
                "quality": 60,
                "maxWidth": 1280,
                "maxHeight": 720,
                "everyNthFrame": 6,
            },
        )

    @pytest.mark.asyncio
    async def test_start_registers_frame_handler(
        self, manager, mock_page, mock_cdp_session, mock_redis
    ):
        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)

        mock_cdp_session.on.assert_called_once_with(
            "Page.screencastFrame", manager._on_frame
        )

    @pytest.mark.asyncio
    async def test_start_noop_if_already_running(
        self, manager, mock_page, mock_redis
    ):
        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)
            # Second start should be a no-op
            await manager.start(mock_page)

        mock_page.context.new_cdp_session.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_start_handles_cdp_failure(
        self, manager, mock_page, mock_redis
    ):
        mock_page.context.new_cdp_session = AsyncMock(
            side_effect=RuntimeError("CDP failed")
        )
        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)

        assert not manager.is_running


class TestCDPScreencastManagerFrame:
    """Test frame handling."""

    @pytest.mark.asyncio
    async def test_on_frame_acks_and_publishes(
        self, manager, mock_page, mock_cdp_session, mock_redis, session_id
    ):
        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)

        # Simulate a frame event
        fake_jpeg = b"\xff\xd8\xff\xe0test-jpeg-data"
        params = {
            "sessionId": 42,
            "data": base64.b64encode(fake_jpeg).decode(),
            "metadata": {"offsetTop": 0, "pageScaleFactor": 1},
        }
        await manager._on_frame(params)

        # Verify ACK was sent with Chrome's session ID
        mock_cdp_session.send.assert_any_await(
            "Page.screencastFrameAck",
            {"sessionId": 42},
        )

        # Verify binary publish
        expected_prefix = session_id.encode("ascii")[:36].ljust(36, b"\x00")
        expected_payload = expected_prefix + fake_jpeg

        mock_redis.publish.assert_awaited_once_with(
            f"screencast:{session_id}",
            expected_payload,
        )
        assert manager.frame_count == 1

    @pytest.mark.asyncio
    async def test_on_frame_ignored_when_not_running(
        self, manager, mock_redis
    ):
        """Frames received after stop should be ignored."""
        manager._redis = mock_redis
        params = {
            "sessionId": 1,
            "data": base64.b64encode(b"test").decode(),
        }
        await manager._on_frame(params)

        mock_redis.publish.assert_not_awaited()
        assert manager.frame_count == 0

    @pytest.mark.asyncio
    async def test_on_frame_continues_on_publish_error(
        self, manager, mock_page, mock_cdp_session, mock_redis, session_id
    ):
        mock_redis.publish = AsyncMock(side_effect=Exception("Redis down"))

        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)

        params = {
            "sessionId": 1,
            "data": base64.b64encode(b"test").decode(),
        }
        # Should not raise
        await manager._on_frame(params)


class TestCDPScreencastManagerStop:
    """Test stopping the screencast."""

    @pytest.mark.asyncio
    async def test_stop_sends_stop_and_detaches(
        self, manager, mock_page, mock_cdp_session, mock_redis
    ):
        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            await manager.start(mock_page)

        # Reset the send mock so we can check stop call
        mock_cdp_session.send.reset_mock()
        await manager.stop()

        mock_cdp_session.send.assert_awaited_once_with(
            "Page.stopScreencast", {}
        )
        mock_cdp_session.detach.assert_awaited_once()
        assert not manager.is_running

    @pytest.mark.asyncio
    async def test_stop_noop_if_not_running(self, manager):
        """Stopping when not started should be a no-op."""
        await manager.stop()
        assert not manager.is_running

    @pytest.mark.asyncio
    async def test_stop_graceful_when_page_closed(
        self, manager, mock_page, mock_cdp_session, mock_redis
    ):
        """If the page is already closed, stop should not raise."""
        mock_cdp_session.send = AsyncMock(
            side_effect=RuntimeError("Target closed")
        )
        mock_cdp_session.detach = AsyncMock(
            side_effect=RuntimeError("Target closed")
        )

        with patch(
            "app.browser.screencast.get_binary_redis",
            return_value=mock_redis,
        ):
            # Manually set running state (start would fail with our mocked send)
            manager._running = True
            manager._cdp = mock_cdp_session

        await manager.stop()
        assert not manager.is_running
