"""Issue prioritization — smart ranking based on multiple signals.

Scores issues by: persona impact count, task-blocking severity,
page importance, and base severity. Produces a priority_score
that ranks issues for the frontend.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue, IssueSeverity
from app.models.session import Session, SessionStatus
from app.models.step import Step

logger = logging.getLogger(__name__)

# Base severity scores
SEVERITY_BASE: dict[str, int] = {
    "critical": 40,
    "major": 25,
    "minor": 10,
    "enhancement": 5,
}

# Page type importance multipliers
LANDING_PAGE_KEYWORDS = ["home", "/", "landing"]
HIGH_TRAFFIC_KEYWORDS = ["signup", "login", "pricing", "checkout", "register"]


class IssuePrioritizer:
    """Calculates priority scores for issues based on multiple signals."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def prioritize_study_issues(
        self,
        study_id: uuid.UUID,
    ) -> list[Issue]:
        """Calculate priority scores for all issues in a study.

        Scoring formula:
        - personas_affected_count * 20 (universal = high priority)
        - caused_give_up * 50 (blocked completion = critical)
        - on_landing_page * 15 (high-traffic page = higher impact)
        - on_high_traffic_page * 10
        - severity_base_score (critical=40, major=25, minor=10, enhancement=5)
        - times_seen_bonus * 5 (recurring issues get a boost)

        Returns:
            Sorted list of issues by priority score (descending).
        """
        # Get all issues
        result = await self.db.execute(
            select(Issue).where(Issue.study_id == study_id)
        )
        issues = list(result.scalars().all())
        if not issues:
            return []

        # Get session data for give-up detection
        session_result = await self.db.execute(
            select(Session).where(Session.study_id == study_id)
        )
        sessions = list(session_result.scalars().all())

        gave_up_session_ids = {
            s.id for s in sessions if s.status == SessionStatus.GAVE_UP
        }

        # Count which persona sessions hit each issue (by page_url + element)
        issue_persona_count = await self._count_personas_per_issue(study_id, issues)

        for issue in issues:
            score = 0.0

            # Base severity score
            severity_val = issue.severity.value if hasattr(issue.severity, "value") else str(issue.severity)
            score += SEVERITY_BASE.get(severity_val, 10)

            # Personas affected
            issue_key = self._issue_key(issue)
            personas_count = issue_persona_count.get(issue_key, 1)
            score += personas_count * 20

            # Caused give-up (issue in a session where persona gave up)
            if issue.session_id in gave_up_session_ids:
                score += 50

            # Page importance
            page_url = (issue.page_url or "").lower()
            if any(kw in page_url for kw in LANDING_PAGE_KEYWORDS):
                score += 15
            if any(kw in page_url for kw in HIGH_TRAFFIC_KEYWORDS):
                score += 10

            # Recurring issue bonus
            if issue.times_seen and issue.times_seen > 1:
                score += min(issue.times_seen, 5) * 5

            # Regression penalty (issue came back after being fixed)
            if issue.is_regression:
                score += 30

            issue.priority_score = score

        await self.db.flush()

        # Sort by priority descending
        issues.sort(key=lambda i: i.priority_score or 0, reverse=True)
        logger.info(
            "Prioritized %d issues for study %s (top score: %.0f)",
            len(issues), study_id, issues[0].priority_score if issues else 0,
        )
        return issues

    async def _count_personas_per_issue(
        self, study_id: uuid.UUID, issues: list[Issue]
    ) -> dict[str, int]:
        """Count how many distinct personas encountered each issue."""
        counts: dict[str, set[uuid.UUID]] = {}

        for issue in issues:
            key = self._issue_key(issue)
            if key not in counts:
                counts[key] = set()
            # Use session's persona_id as the persona identifier
            counts[key].add(issue.session_id)

        return {k: len(v) for k, v in counts.items()}

    @staticmethod
    def _issue_key(issue: Issue) -> str:
        """Create a grouping key for an issue."""
        element = (issue.element or "").lower().strip()[:50]
        desc = (issue.description or "").lower().strip()[:80]
        page = (issue.page_url or "").lower().strip()
        return f"{page}|{element}|{desc}"
