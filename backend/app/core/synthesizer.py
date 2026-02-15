"""Cross-persona insight synthesizer — comparative analysis across all sessions."""

from __future__ import annotations

import logging
from typing import Any

from app.llm.client import LLMClient
from app.llm.schemas import StudySynthesis

logger = logging.getLogger(__name__)

# Minimum score for a study where at least one persona navigated successfully.
# A score of 0 should only happen when the site doesn't load at all.
_MIN_SCORE_WITH_STEPS = 10


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
        extended_thinking: bool = True,
        thinking_budget_tokens: int = 10000,
    ) -> StudySynthesis:
        """Run cross-persona synthesis to produce the final study analysis.

        Args:
            study_url: The target website URL.
            tasks: List of task descriptions.
            session_summaries: Summary data from each persona's session.
            all_issues: All UX issues found across all sessions.
            extended_thinking: Enable Opus extended thinking for deeper analysis.
            thinking_budget_tokens: Token budget for extended thinking.

        Returns:
            StudySynthesis with executive summary, scores, issues,
            struggle points, and prioritized recommendations.
            Includes reasoning_trace when extended_thinking is enabled.
        """
        logger.info(
            "Synthesizing study: url=%s, sessions=%d, issues=%d, extended_thinking=%s",
            study_url, len(session_summaries), len(all_issues), extended_thinking,
        )

        if extended_thinking:
            try:
                synthesis = await self._llm.synthesize_study_with_thinking(
                    study_url=study_url,
                    tasks=tasks,
                    session_summaries=session_summaries,
                    all_issues=all_issues,
                    thinking_budget_tokens=thinking_budget_tokens,
                )
                logger.info(
                    "Synthesis with thinking complete: score=%d, reasoning_trace=%d chars",
                    synthesis.overall_ux_score,
                    len(synthesis.reasoning_trace),
                )
                synthesis = self._apply_score_floor(
                    synthesis, session_summaries, all_issues,
                )
                return synthesis
            except Exception as e:
                logger.warning(
                    "Extended thinking synthesis failed, falling back to standard: %s", e
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

        synthesis = self._apply_score_floor(
            synthesis, session_summaries, all_issues,
        )
        return synthesis

    @staticmethod
    def _apply_score_floor(
        synthesis: StudySynthesis,
        session_summaries: list[dict[str, Any]],
        all_issues: list[dict[str, Any]],
    ) -> StudySynthesis:
        """Enforce a minimum score when there is real navigational evidence.

        A score of 0 is only valid when the website literally doesn't load.
        If personas took steps and found issues, the site IS functional and
        deserves a score that reflects the observed UX quality.
        """
        total_steps = sum(s.get("total_steps", 0) for s in session_summaries)
        has_evidence = total_steps > 0 or len(all_issues) > 0

        if has_evidence and synthesis.overall_ux_score < _MIN_SCORE_WITH_STEPS:
            original = synthesis.overall_ux_score
            # Calculate a floor based on the evidence:
            # - More steps and issues = more evidence that the site functions
            peak_progress = max(
                (s.get("task_progress_percent", 0) for s in session_summaries),
                default=0,
            )
            # Floor: at least 10, plus bonus for progress made
            floor = _MIN_SCORE_WITH_STEPS + min(peak_progress // 5, 10)
            synthesis.overall_ux_score = max(synthesis.overall_ux_score, floor)
            logger.warning(
                "Score floor applied: %d → %d (total_steps=%d, issues=%d, peak_progress=%d%%)",
                original, synthesis.overall_ux_score, total_steps, len(all_issues), peak_progress,
            )
        return synthesis

    @staticmethod
    def synthesis_to_dict(synthesis: StudySynthesis) -> dict[str, Any]:
        """Convert synthesis to dict for storage and report generation."""
        return synthesis.model_dump()
