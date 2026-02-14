"""Tests for the cross-persona insight synthesizer."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.core.synthesizer import Synthesizer
from app.llm.schemas import StudySynthesis


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSynthesizer:
    """Test cross-persona synthesis."""

    @pytest.fixture
    def synthesizer(
        self, mock_llm_client: AsyncMock, sample_study_synthesis: StudySynthesis
    ) -> Synthesizer:
        mock_llm_client.synthesize_study = AsyncMock(return_value=sample_study_synthesis)
        mock_llm_client.synthesize_study_with_thinking = AsyncMock(return_value=sample_study_synthesis)
        return Synthesizer(mock_llm_client)

    @pytest.mark.asyncio
    async def test_synthesize_returns_study_synthesis(
        self, synthesizer: Synthesizer
    ) -> None:
        result = await synthesizer.synthesize(
            study_url="https://example.com",
            tasks=["Sign up for an account"],
            session_summaries=[
                {"persona_name": "Maria", "task_completed": True, "total_steps": 12},
                {"persona_name": "John", "task_completed": False, "total_steps": 25},
            ],
            all_issues=[
                {"severity": "major", "description": "Low contrast text", "page_url": "/signup"},
            ],
        )

        assert isinstance(result, StudySynthesis)
        assert result.overall_ux_score == 65
        assert len(result.executive_summary) > 0
        assert len(result.universal_issues) > 0
        assert len(result.recommendations) > 0

    @pytest.mark.asyncio
    async def test_synthesize_calls_llm_with_correct_args(
        self, mock_llm_client: AsyncMock, sample_study_synthesis: StudySynthesis
    ) -> None:
        mock_llm_client.synthesize_study = AsyncMock(return_value=sample_study_synthesis)
        mock_llm_client.synthesize_study_with_thinking = AsyncMock(return_value=sample_study_synthesis)
        synthesizer = Synthesizer(mock_llm_client)

        summaries = [{"persona_name": "Maria", "task_completed": True}]
        issues = [{"severity": "major", "description": "Issue"}]

        await synthesizer.synthesize(
            study_url="https://test.com",
            tasks=["Task 1", "Task 2"],
            session_summaries=summaries,
            all_issues=issues,
        )

        # Extended thinking is enabled by default, so synthesize_study_with_thinking is called
        mock_llm_client.synthesize_study_with_thinking.assert_awaited_once_with(
            study_url="https://test.com",
            tasks=["Task 1", "Task 2"],
            session_summaries=summaries,
            all_issues=issues,
            thinking_budget_tokens=10000,
        )

    def test_synthesis_to_dict(self, sample_study_synthesis: StudySynthesis) -> None:
        d = Synthesizer.synthesis_to_dict(sample_study_synthesis)
        assert isinstance(d, dict)
        assert d["overall_ux_score"] == 65
        assert d["executive_summary"] == sample_study_synthesis.executive_summary
        assert len(d["universal_issues"]) == len(sample_study_synthesis.universal_issues)
        assert len(d["recommendations"]) == len(sample_study_synthesis.recommendations)
