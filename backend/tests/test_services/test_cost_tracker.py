"""Tests for the CostTracker (Iteration 4)."""

from __future__ import annotations

import pytest

from app.services.cost_estimator import CostTracker


class TestCostTracker:
    """Test actual cost tracking during study runs."""

    def test_initial_state_is_zero(self) -> None:
        tracker = CostTracker()
        breakdown = tracker.get_breakdown()
        assert breakdown.total_cost_usd == 0.0
        assert breakdown.llm_api_calls == 0
        assert breakdown.browser_sessions == 0

    def test_llm_usage_tracking(self) -> None:
        tracker = CostTracker()
        tracker.record_llm_usage(1000, 500)
        tracker.record_llm_usage(2000, 1000)

        breakdown = tracker.get_breakdown()
        assert breakdown.llm_input_tokens == 3000
        assert breakdown.llm_output_tokens == 1500
        assert breakdown.llm_total_tokens == 4500
        assert breakdown.llm_api_calls == 2
        assert breakdown.llm_cost_usd > 0

    def test_browser_mode_tracking(self) -> None:
        tracker = CostTracker()
        tracker.set_browser_mode("local")
        breakdown = tracker.get_breakdown()
        assert breakdown.browser_mode == "local"

    def test_cloud_mode_has_browser_cost(self) -> None:
        import time

        tracker = CostTracker()
        tracker.set_browser_mode("cloud")
        tracker.start_browser_session("sess-1")
        time.sleep(0.1)
        tracker.end_browser_session("sess-1")

        breakdown = tracker.get_breakdown()
        assert breakdown.browser_sessions == 1
        assert breakdown.browser_time_seconds > 0
        assert breakdown.browser_cost_usd > 0

    def test_local_mode_no_browser_cost(self) -> None:
        import time

        tracker = CostTracker()
        tracker.set_browser_mode("local")
        tracker.start_browser_session("sess-1")
        time.sleep(0.1)
        tracker.end_browser_session("sess-1")

        breakdown = tracker.get_breakdown()
        assert breakdown.browser_cost_usd == 0.0
        assert breakdown.savings_vs_cloud_usd > 0

    def test_screenshot_tracking(self) -> None:
        tracker = CostTracker()
        tracker.record_screenshot(50000)
        tracker.record_screenshot(30000)

        breakdown = tracker.get_breakdown()
        assert breakdown.storage_screenshots == 2
        assert breakdown.storage_size_mb > 0
