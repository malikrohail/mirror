"""Tests for browser actions."""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from playwright.async_api import TimeoutError as PlaywrightTimeout

from app.browser.actions import BrowserActions, ActionResult


class TestBrowserActions:
    """Test browser action execution."""

    @pytest.fixture
    def actions(self) -> BrowserActions:
        return BrowserActions(timeout_ms=5000)

    @pytest.mark.asyncio
    async def test_click_success(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.click(mock_page, "#btn")
        assert result.success is True
        assert result.action_type == "click"
        mock_page.click.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_click_retries_once_on_timeout(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        """First click times out, second succeeds."""
        mock_page.click = AsyncMock(
            side_effect=[PlaywrightTimeout("timeout"), None]
        )
        result = await actions.click(mock_page, "#btn")
        assert result.success is True
        assert mock_page.click.await_count == 2

    @pytest.mark.asyncio
    async def test_click_fails_after_retry(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        mock_page.click = AsyncMock(
            side_effect=PlaywrightTimeout("timeout")
        )
        result = await actions.click(mock_page, "#btn")
        assert result.success is False
        assert "not found" in result.error.lower()

    @pytest.mark.asyncio
    async def test_type_text_success(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.type_text(mock_page, "#email", "test@example.com")
        assert result.success is True
        assert result.action_type == "type"
        mock_page.fill.assert_awaited_once()  # Clear
        mock_page.type.assert_awaited_once()   # Type

    @pytest.mark.asyncio
    async def test_type_text_with_delay(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        await actions.type_text(mock_page, "#name", "Maria")
        # Verify the type call used a delay
        call_kwargs = mock_page.type.call_args
        assert call_kwargs[1]["delay"] == 50  # REALISTIC_TYPE_DELAY_MS

    @pytest.mark.asyncio
    async def test_scroll_down(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.scroll(mock_page, "down", 500)
        assert result.success is True
        assert result.action_type == "scroll"
        mock_page.evaluate.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_scroll_up(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.scroll(mock_page, "up", 300)
        assert result.success is True
        # Verify negative scroll value
        call_args = mock_page.evaluate.call_args[0][0]
        assert "-300" in call_args

    @pytest.mark.asyncio
    async def test_scroll_to_element(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.scroll(mock_page, "#footer")
        assert result.success is True
        mock_page.locator.assert_called_once_with("#footer")

    @pytest.mark.asyncio
    async def test_navigate_success(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.navigate(mock_page, "https://example.com/pricing")
        assert result.success is True
        assert result.action_type == "navigate"
        mock_page.goto.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_go_back(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.go_back(mock_page)
        assert result.success is True
        assert result.action_type == "go_back"
        mock_page.go_back.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_wait(self, actions: BrowserActions, mock_page: AsyncMock) -> None:
        result = await actions.wait(mock_page, 500)
        assert result.success is True
        assert result.action_type == "wait"

    @pytest.mark.asyncio
    async def test_execute_dispatches_click(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        result = await actions.execute(mock_page, "click", selector="#btn")
        assert result.success is True
        assert result.action_type == "click"

    @pytest.mark.asyncio
    async def test_execute_dispatches_type(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        result = await actions.execute(
            mock_page, "type", selector="#email", value="test@test.com"
        )
        assert result.success is True
        assert result.action_type == "type"

    @pytest.mark.asyncio
    async def test_execute_done_action(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        result = await actions.execute(mock_page, "done")
        assert result.success is True
        assert result.action_type == "done"

    @pytest.mark.asyncio
    async def test_execute_give_up_action(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        result = await actions.execute(mock_page, "give_up")
        assert result.success is True
        assert result.action_type == "give_up"

    @pytest.mark.asyncio
    async def test_execute_unknown_action(
        self, actions: BrowserActions, mock_page: AsyncMock
    ) -> None:
        result = await actions.execute(mock_page, "fly_to_moon")
        assert result.success is False
        assert "unknown" in result.description.lower() or "unsupported" in result.error.lower()
