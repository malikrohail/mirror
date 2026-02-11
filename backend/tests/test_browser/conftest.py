"""Shared test fixtures for browser tests."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, PropertyMock

import pytest


@pytest.fixture
def mock_page() -> AsyncMock:
    """Create a mock Playwright Page."""
    page = AsyncMock()
    page.url = "https://example.com"
    page.title = AsyncMock(return_value="Example Page")
    page.viewport_size = {"width": 1920, "height": 1080}
    page.screenshot = AsyncMock(return_value=b"fake-png-data")
    page.click = AsyncMock()
    page.fill = AsyncMock()
    page.type = AsyncMock()
    page.evaluate = AsyncMock(return_value="[button] Click me\n[link] Home")
    page.goto = AsyncMock()
    page.go_back = AsyncMock()
    page.wait_for_load_state = AsyncMock()
    page.wait_for_timeout = AsyncMock()

    # Locator mock
    locator = AsyncMock()
    locator.scroll_into_view_if_needed = AsyncMock()
    locator.bounding_box = AsyncMock(return_value={"x": 100, "y": 200, "width": 80, "height": 30})
    page.locator = MagicMock(return_value=locator)

    return page
