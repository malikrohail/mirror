"""Tests for the screenshot UX analyzer."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.core.analyzer import Analyzer, AnalysisResult
from app.llm.schemas import (
    PageAssessment,
    ScreenshotAnalysis,
    Severity,
    UXIssue,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def analyzer(mock_llm_client: AsyncMock, sample_screenshot_analysis: ScreenshotAnalysis) -> Analyzer:
    mock_llm_client.analyze_screenshot = AsyncMock(return_value=sample_screenshot_analysis)
    return Analyzer(mock_llm_client)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestAnalyzer:
    """Test screenshot analysis."""

    @pytest.mark.asyncio
    async def test_analyze_step(
        self, analyzer: Analyzer, sample_screenshot_analysis: ScreenshotAnalysis
    ) -> None:
        result = await analyzer.analyze_step(
            screenshot=b"fake-png",
            page_url="https://example.com/signup",
            page_title="Sign Up",
        )
        assert isinstance(result, ScreenshotAnalysis)
        assert result.page_url == "https://example.com/signup"
        assert len(result.issues) > 0

    @pytest.mark.asyncio
    async def test_analyze_session_deduplicates_pages(
        self, analyzer: Analyzer
    ) -> None:
        """Same page URL should only be analyzed once."""
        steps = [
            {"step_number": 1, "page_url": "https://example.com/a", "page_title": "A", "screenshot_bytes": b"img1"},
            {"step_number": 2, "page_url": "https://example.com/a", "page_title": "A", "screenshot_bytes": b"img2"},
            {"step_number": 3, "page_url": "https://example.com/b", "page_title": "B", "screenshot_bytes": b"img3"},
        ]
        result = await analyzer.analyze_session("sess-1", steps)
        assert isinstance(result, AnalysisResult)
        # Should have analyzed 2 unique pages, not 3
        assert len(result.analyses) == 2

    @pytest.mark.asyncio
    async def test_analyze_session_skips_steps_without_screenshots(
        self, analyzer: Analyzer
    ) -> None:
        steps = [
            {"step_number": 1, "page_url": "https://example.com/a", "page_title": "A", "screenshot_bytes": None},
            {"step_number": 2, "page_url": "https://example.com/b", "page_title": "B", "screenshot_bytes": b"img"},
        ]
        result = await analyzer.analyze_session("sess-1", steps)
        assert len(result.analyses) == 1

    @pytest.mark.asyncio
    async def test_analyze_session_handles_llm_failure(
        self, mock_llm_client: AsyncMock
    ) -> None:
        mock_llm_client.analyze_screenshot = AsyncMock(side_effect=RuntimeError("LLM error"))
        analyzer = Analyzer(mock_llm_client)

        steps = [
            {"step_number": 1, "page_url": "https://example.com", "page_title": "X", "screenshot_bytes": b"img"},
        ]
        result = await analyzer.analyze_session("sess-1", steps)
        # Should not crash, just return empty
        assert len(result.analyses) == 0

    @pytest.mark.asyncio
    async def test_analyze_session_empty_steps(self, analyzer: Analyzer) -> None:
        result = await analyzer.analyze_session("sess-1", [])
        assert len(result.analyses) == 0
        assert len(result.all_issues) == 0


class TestIssueDeduplification:
    """Test issue deduplication logic."""

    def test_empty_list(self) -> None:
        assert Analyzer._deduplicate_issues([]) == []

    def test_no_duplicates(self) -> None:
        issues = [
            UXIssue(
                element="Button A",
                description="Too small",
                severity=Severity.minor,
                heuristic="H1",
                recommendation="Make bigger",
            ),
            UXIssue(
                element="Button B",
                description="Wrong color",
                severity=Severity.major,
                heuristic="H2",
                recommendation="Change color",
            ),
        ]
        result = Analyzer._deduplicate_issues(issues)
        assert len(result) == 2

    def test_duplicate_merged_keeps_higher_severity(self) -> None:
        issues = [
            UXIssue(
                element="Submit button",
                description="Too small to click on mobile devices",
                severity=Severity.minor,
                heuristic="H7",
                recommendation="Increase size",
            ),
            UXIssue(
                element="Submit button",
                description="Too small to click on mobile devices",
                severity=Severity.critical,
                heuristic="H7",
                recommendation="Increase size to 44px",
            ),
        ]
        result = Analyzer._deduplicate_issues(issues)
        assert len(result) == 1
        assert result[0].severity == Severity.critical

    def test_similar_elements_different_descriptions(self) -> None:
        issues = [
            UXIssue(
                element="Nav menu",
                description="Hard to find",
                severity=Severity.major,
                heuristic="H6",
                recommendation="Make visible",
            ),
            UXIssue(
                element="Nav menu",
                description="Confusing layout with too many options",
                severity=Severity.minor,
                heuristic="H8",
                recommendation="Simplify",
            ),
        ]
        result = Analyzer._deduplicate_issues(issues)
        # Different descriptions = different issues
        assert len(result) == 2

    def test_issues_to_dicts(self) -> None:
        issues = [
            UXIssue(
                element="Button",
                description="Low contrast",
                severity=Severity.major,
                heuristic="H1",
                recommendation="Fix contrast",
            ),
        ]
        dicts = Analyzer.issues_to_dicts(issues)
        assert len(dicts) == 1
        assert dicts[0]["element"] == "Button"
        assert dicts[0]["severity"] == "major"
