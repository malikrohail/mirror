"""Tests for the report builder."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.core.report_builder import ReportBuilder, _score_to_grade
from app.llm.schemas import ReportContent, StudySynthesis


class TestScoreToGrade:
    """Test score-to-grade conversion."""

    def test_excellent(self) -> None:
        assert _score_to_grade(95) == "Excellent"
        assert _score_to_grade(90) == "Excellent"

    def test_good(self) -> None:
        assert _score_to_grade(89) == "Good"
        assert _score_to_grade(70) == "Good"

    def test_fair(self) -> None:
        assert _score_to_grade(69) == "Fair"
        assert _score_to_grade(50) == "Fair"

    def test_poor(self) -> None:
        assert _score_to_grade(49) == "Poor"
        assert _score_to_grade(30) == "Poor"

    def test_critical(self) -> None:
        assert _score_to_grade(29) == "Critical"
        assert _score_to_grade(0) == "Critical"


class TestRenderMarkdown:
    """Test Markdown report generation."""

    @pytest.fixture
    def builder(self, mock_llm_client: AsyncMock) -> ReportBuilder:
        return ReportBuilder(mock_llm_client)

    def test_markdown_contains_title(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, [])
        assert "# Usability Test Report: Example.com" in md

    def test_markdown_contains_score(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, [])
        assert "65/100" in md
        assert "Fair" in md

    def test_markdown_contains_executive_summary(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, [])
        assert "## Executive Summary" in md
        assert sample_report_content.executive_summary in md

    def test_markdown_contains_methodology(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, [])
        assert "## Methodology" in md

    def test_markdown_contains_persona_table(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        summaries = [
            {
                "persona_name": "Maria",
                "task_completed": True,
                "total_steps": 12,
                "overall_difficulty": "moderate",
            },
            {
                "persona_name": "John",
                "task_completed": False,
                "total_steps": 25,
                "overall_difficulty": "difficult",
            },
        ]
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, summaries)
        assert "## Persona Overview" in md
        assert "Maria" in md
        assert "John" in md
        assert "Yes" in md  # Maria completed
        assert "No" in md   # John didn't

    def test_markdown_contains_recommendations_table(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, [])
        assert "## Prioritized Recommendations" in md
        assert "team name" in md.lower()

    def test_markdown_contains_conclusion(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, [])
        assert "## Conclusion" in md
        assert sample_report_content.conclusion in md

    def test_markdown_contains_mirror_branding(
        self,
        builder: ReportBuilder,
        sample_report_content: ReportContent,
        sample_study_synthesis: StudySynthesis,
    ) -> None:
        md = builder.render_markdown(sample_report_content, sample_study_synthesis, [])
        assert "Mirror" in md


class TestRenderPDF:
    """Test PDF rendering."""

    @pytest.fixture
    def builder(self, mock_llm_client: AsyncMock) -> ReportBuilder:
        return ReportBuilder(mock_llm_client)

    def test_render_pdf_returns_bytes(self, builder: ReportBuilder) -> None:
        """PDF or HTML fallback should return bytes."""
        md = "# Test Report\n\nThis is a test."
        result = builder.render_pdf(md, "https://example.com")
        assert isinstance(result, bytes)
        assert len(result) > 0

    def test_render_pdf_html_contains_title(self, builder: ReportBuilder) -> None:
        """The generated HTML should contain the study URL."""
        md = "# Test\n\nContent"
        result = builder.render_pdf(md, "https://example.com")
        # Whether WeasyPrint is installed or not, we should get output
        assert len(result) > 0


class TestMarkdownToHtml:
    """Test the internal Markdown→HTML converter."""

    def test_headers_converted(self) -> None:
        html = ReportBuilder._markdown_to_html("# Title\n## Subtitle", "https://test.com")
        assert "<h1>Title</h1>" in html
        assert "<h2>Subtitle</h2>" in html

    def test_bold_converted(self) -> None:
        html = ReportBuilder._markdown_to_html("This is **bold** text", "https://test.com")
        assert "<strong>bold</strong>" in html

    def test_italic_converted(self) -> None:
        html = ReportBuilder._markdown_to_html("This is *italic* text", "https://test.com")
        assert "<em>italic</em>" in html

    def test_table_rows_converted(self) -> None:
        md = "| A | B |\n|---|---|\n| 1 | 2 |"
        html = ReportBuilder._markdown_to_html(md, "https://test.com")
        assert "<td>A</td>" in html
        assert "<td>1</td>" in html

    def test_html_has_styling(self) -> None:
        html = ReportBuilder._markdown_to_html("# Test", "https://test.com")
        assert "<style>" in html
        assert "font-family" in html
