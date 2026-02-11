"""Tests for the navigation agent loop."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.browser.actions import ActionResult
from app.core.navigator import Navigator, NavigationResult, StepRecord
from app.llm.schemas import (
    ActionType,
    EmotionalState,
    NavigationAction,
    NavigationDecision,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_browser_context() -> AsyncMock:
    """Mock Playwright BrowserContext."""
    ctx = AsyncMock()
    page = AsyncMock()
    page.url = "https://example.com"
    page.title = AsyncMock(return_value="Example")
    page.viewport_size = {"width": 1920, "height": 1080}
    page.goto = AsyncMock()
    page.wait_for_timeout = AsyncMock()
    page.close = AsyncMock()
    ctx.new_page = AsyncMock(return_value=page)
    return ctx


@pytest.fixture
def mock_screenshot_service() -> AsyncMock:
    """Mock ScreenshotService."""
    svc = AsyncMock()
    svc.capture_screenshot = AsyncMock(return_value=b"fake-png-data")
    svc.get_accessibility_tree = AsyncMock(return_value="[button] Click me")
    svc.get_page_metadata = AsyncMock(return_value=MagicMock(
        url="https://example.com",
        title="Example",
        viewport_width=1920,
        viewport_height=1080,
    ))
    svc.get_click_position = AsyncMock(return_value=(500, 300))
    return svc


@pytest.fixture
def mock_actions() -> AsyncMock:
    """Mock BrowserActions."""
    actions = AsyncMock()
    actions.execute = AsyncMock(return_value=ActionResult(
        success=True,
        action_type="click",
        description="Clicked element",
    ))
    return actions


def _make_decision(
    action_type: ActionType = ActionType.click,
    task_progress: int = 30,
    emotional_state: EmotionalState = EmotionalState.curious,
) -> NavigationDecision:
    return NavigationDecision(
        think_aloud="I see the button, let me click it",
        action=NavigationAction(
            type=action_type,
            selector="#btn" if action_type == ActionType.click else None,
            value=None,
            description="Click the button",
        ),
        confidence=0.8,
        task_progress=task_progress,
        emotional_state=emotional_state,
        reasoning="Logical next step",
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestNavigator:
    """Test the navigation agent loop."""

    @pytest.mark.asyncio
    async def test_basic_navigation_completes_on_done(
        self,
        mock_llm_client: AsyncMock,
        mock_browser_context: AsyncMock,
        mock_screenshot_service: AsyncMock,
        mock_actions: AsyncMock,
    ) -> None:
        """Test that navigation stops when LLM returns 'done' action."""
        # First step: click, second step: done
        mock_llm_client.navigate_step = AsyncMock(side_effect=[
            _make_decision(ActionType.click, task_progress=50),
            _make_decision(ActionType.done, task_progress=100),
        ])

        navigator = Navigator(
            mock_llm_client,
            browser_actions=mock_actions,
            screenshot_service=mock_screenshot_service,
            max_steps=10,
        )

        result = await navigator.navigate_session(
            session_id="sess-1",
            persona={"name": "Test User", "device_preference": "desktop"},
            task_description="Sign up for an account",
            behavioral_notes="MODERATE TECH LITERACY",
            start_url="https://example.com",
            browser_context=mock_browser_context,
        )

        assert isinstance(result, NavigationResult)
        assert result.task_completed is True
        assert result.total_steps == 2
        assert result.gave_up is False

    @pytest.mark.asyncio
    async def test_navigation_gives_up(
        self,
        mock_llm_client: AsyncMock,
        mock_browser_context: AsyncMock,
        mock_screenshot_service: AsyncMock,
        mock_actions: AsyncMock,
    ) -> None:
        """Test that navigation stops when LLM returns 'give_up'."""
        mock_llm_client.navigate_step = AsyncMock(side_effect=[
            _make_decision(ActionType.click, task_progress=10),
            _make_decision(ActionType.give_up, task_progress=10),
        ])

        navigator = Navigator(
            mock_llm_client,
            browser_actions=mock_actions,
            screenshot_service=mock_screenshot_service,
            max_steps=10,
        )

        result = await navigator.navigate_session(
            session_id="sess-1",
            persona={"name": "Test User"},
            task_description="Find the pricing page",
            behavioral_notes="",
            start_url="https://example.com",
            browser_context=mock_browser_context,
        )

        assert result.task_completed is False
        assert result.gave_up is True

    @pytest.mark.asyncio
    async def test_navigation_stops_at_max_steps(
        self,
        mock_llm_client: AsyncMock,
        mock_browser_context: AsyncMock,
        mock_screenshot_service: AsyncMock,
        mock_actions: AsyncMock,
    ) -> None:
        """Test that navigation stops after max_steps."""
        mock_llm_client.navigate_step = AsyncMock(
            return_value=_make_decision(ActionType.click, task_progress=20)
        )

        navigator = Navigator(
            mock_llm_client,
            browser_actions=mock_actions,
            screenshot_service=mock_screenshot_service,
            max_steps=3,
        )

        result = await navigator.navigate_session(
            session_id="sess-1",
            persona={"name": "Test User"},
            task_description="Complete signup",
            behavioral_notes="",
            start_url="https://example.com",
            browser_context=mock_browser_context,
        )

        assert result.total_steps == 3
        assert result.task_completed is False

    @pytest.mark.asyncio
    async def test_navigation_stops_at_high_progress(
        self,
        mock_llm_client: AsyncMock,
        mock_browser_context: AsyncMock,
        mock_screenshot_service: AsyncMock,
        mock_actions: AsyncMock,
    ) -> None:
        """Test that navigation stops when task_progress >= 95."""
        mock_llm_client.navigate_step = AsyncMock(
            return_value=_make_decision(ActionType.click, task_progress=97)
        )

        navigator = Navigator(
            mock_llm_client,
            browser_actions=mock_actions,
            screenshot_service=mock_screenshot_service,
            max_steps=30,
        )

        result = await navigator.navigate_session(
            session_id="sess-1",
            persona={"name": "Test User"},
            task_description="Find pricing",
            behavioral_notes="",
            start_url="https://example.com",
            browser_context=mock_browser_context,
        )

        assert result.total_steps == 1
        assert result.task_completed is True

    @pytest.mark.asyncio
    async def test_step_records_populated(
        self,
        mock_llm_client: AsyncMock,
        mock_browser_context: AsyncMock,
        mock_screenshot_service: AsyncMock,
        mock_actions: AsyncMock,
    ) -> None:
        """Test that step records contain correct data."""
        mock_llm_client.navigate_step = AsyncMock(side_effect=[
            _make_decision(ActionType.click, task_progress=50, emotional_state=EmotionalState.confused),
            _make_decision(ActionType.done, task_progress=100, emotional_state=EmotionalState.satisfied),
        ])

        navigator = Navigator(
            mock_llm_client,
            browser_actions=mock_actions,
            screenshot_service=mock_screenshot_service,
            max_steps=10,
        )

        result = await navigator.navigate_session(
            session_id="sess-1",
            persona={"name": "Maria"},
            task_description="Test task",
            behavioral_notes="",
            start_url="https://example.com",
            browser_context=mock_browser_context,
        )

        assert len(result.steps) == 2
        assert result.steps[0].step_number == 1
        assert result.steps[0].action_type == "click"
        assert result.steps[0].emotional_state == "confused"
        assert result.steps[1].action_type == "done"
        assert result.persona_name == "Maria"


class TestStuckDetection:
    """Test the stuck detection logic."""

    def test_not_stuck_with_few_steps(self) -> None:
        steps = [
            StepRecord(1, "https://example.com", "click", "...", 10, "neutral"),
        ]
        assert Navigator._is_stuck(steps) is False

    def test_not_stuck_with_different_urls(self) -> None:
        steps = [
            StepRecord(1, "https://example.com/a", "click", "...", 10, "neutral"),
            StepRecord(2, "https://example.com/b", "click", "...", 20, "neutral"),
            StepRecord(3, "https://example.com/c", "click", "...", 30, "neutral"),
        ]
        assert Navigator._is_stuck(steps) is False

    def test_stuck_on_same_url_no_progress(self) -> None:
        steps = [
            StepRecord(1, "https://example.com", "click", "...", 10, "neutral"),
            StepRecord(2, "https://example.com", "click", "...", 10, "confused"),
            StepRecord(3, "https://example.com", "click", "...", 10, "frustrated"),
        ]
        assert Navigator._is_stuck(steps) is True

    def test_not_stuck_with_progress(self) -> None:
        steps = [
            StepRecord(1, "https://example.com", "click", "...", 10, "neutral"),
            StepRecord(2, "https://example.com", "click", "...", 20, "neutral"),
            StepRecord(3, "https://example.com", "click", "...", 30, "neutral"),
        ]
        assert Navigator._is_stuck(steps) is False


class TestBuildHistorySummary:
    """Test the history summary builder."""

    def test_empty_history(self) -> None:
        assert Navigator._build_history_summary([]) == ""

    def test_single_step(self) -> None:
        steps = [
            StepRecord(1, "https://example.com", "click", "Clicked button", 10, "curious"),
        ]
        summary = Navigator._build_history_summary(steps)
        assert "Step 1" in summary
        assert "curious" in summary
        assert "Clicked button" in summary

    def test_long_history_truncated(self) -> None:
        """Should only include the last 8 steps."""
        steps = [
            StepRecord(i, f"https://example.com/p{i}", "click", f"Step {i}", i * 5, "neutral")
            for i in range(1, 15)
        ]
        summary = Navigator._build_history_summary(steps)
        # Should NOT include step 1-6
        assert "Step 1:" not in summary
        # Should include step 7-14
        assert "Step 14" in summary
