"""Cross-persona insight synthesizer — comparative analysis across all sessions."""

from __future__ import annotations

import logging
from typing import Any

from app.llm.client import LLMClient
from app.llm.schemas import StudySynthesis

logger = logging.getLogger(__name__)


class Synthesizer:
    """Synthesizes findings across all persona sessions into comparative insights."""

    def __init__(self, llm_client: LLMClient) -> None:
        self._llm = llm_client

    async def synthesize(
        self,
        study_url: str,
        tasks: list[str],
        session_summaries: list[dict[str, Any]],
        all_issues: list[dict[str, Any]],
    ) -> StudySynthesis:
        """Run cross-persona synthesis to produce the final study analysis.

        Args:
            study_url: The target website URL.
            tasks: List of task descriptions.
            session_summaries: Summary data from each persona's session.
            all_issues: All UX issues found across all sessions.

        Returns:
            StudySynthesis with executive summary, scores, issues,
            struggle points, and prioritized recommendations.
        """
        logger.info(
            "Synthesizing study: url=%s, sessions=%d, issues=%d",
            study_url, len(session_summaries), len(all_issues),
        )

        synthesis = await self._llm.synthesize_study(
            study_url=study_url,
            tasks=tasks,
            session_summaries=session_summaries,
            all_issues=all_issues,
        )

        logger.info(
            "Synthesis complete: score=%d, recommendations=%d, struggle_points=%d",
            synthesis.overall_ux_score,
            len(synthesis.recommendations),
            len(synthesis.struggle_points),
        )

        return synthesis

    @staticmethod
    def synthesis_to_dict(synthesis: StudySynthesis) -> dict[str, Any]:
        """Convert synthesis to dict for storage and report generation."""
        return synthesis.model_dump()
