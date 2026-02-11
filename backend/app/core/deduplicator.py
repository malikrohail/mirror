"""Issue deduplication across studies.

Compares new issues against existing issues for the same URL domain,
clusters duplicates by element + description similarity, and tracks
recurrence with first_seen, times_seen, and is_regression flags.
"""

from __future__ import annotations

import logging
import uuid
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.7  # Minimum similarity ratio to consider duplicate


class IssueDeduplicator:
    """Deduplicates issues across studies for the same URL domain."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def deduplicate_study_issues(
        self,
        study_id: uuid.UUID,
        site_url: str,
    ) -> dict[str, Any]:
        """Deduplicate issues within a study and cross-reference with prior studies.

        Args:
            study_id: The current study ID.
            site_url: The target site URL (for finding prior studies).

        Returns:
            Summary of deduplication results.
        """
        # Get all issues for the current study
        result = await self.db.execute(
            select(Issue).where(Issue.study_id == study_id)
        )
        current_issues = list(result.scalars().all())

        if not current_issues:
            return {"total": 0, "duplicates_merged": 0, "regressions": 0}

        # 1. Intra-study dedup: mark duplicates within this study
        dedup_groups = self._cluster_similar_issues(current_issues)

        # 2. Cross-study dedup: find matching issues from prior studies
        from app.models.study import Study
        prior_result = await self.db.execute(
            select(Issue)
            .join(Study)
            .where(
                Study.url == site_url,
                Study.id != study_id,
            )
            .order_by(Issue.created_at.desc())
            .limit(500)
        )
        prior_issues = list(prior_result.scalars().all())

        regressions = 0
        for issue in current_issues:
            match = self._find_matching_issue(issue, prior_issues)
            if match:
                # Issue seen before — update tracking fields
                if issue.first_seen_study_id is None:
                    issue.first_seen_study_id = match.first_seen_study_id or match.study_id
                issue.times_seen = (match.times_seen or 1) + 1

                # Check for regression (was in an older study, not in a more recent one)
                if match.is_regression:
                    issue.is_regression = True
                    regressions += 1
            else:
                # First time seeing this issue
                if issue.first_seen_study_id is None:
                    issue.first_seen_study_id = study_id
                issue.times_seen = 1

        await self.db.flush()

        return {
            "total": len(current_issues),
            "duplicates_merged": sum(len(g) - 1 for g in dedup_groups if len(g) > 1),
            "regressions": regressions,
            "unique_issues": len(dedup_groups),
        }

    def _cluster_similar_issues(self, issues: list[Issue]) -> list[list[Issue]]:
        """Group similar issues within a single study."""
        if not issues:
            return []

        clusters: list[list[Issue]] = []
        used = set()

        for i, issue_a in enumerate(issues):
            if i in used:
                continue
            cluster = [issue_a]
            used.add(i)

            for j, issue_b in enumerate(issues):
                if j in used:
                    continue
                if self._are_similar(issue_a, issue_b):
                    cluster.append(issue_b)
                    used.add(j)

            clusters.append(cluster)

        return clusters

    def _find_matching_issue(self, issue: Issue, prior_issues: list[Issue]) -> Issue | None:
        """Find a matching issue from prior studies."""
        for prior in prior_issues:
            if self._are_similar(issue, prior):
                return prior
        return None

    @staticmethod
    def _are_similar(a: Issue, b: Issue) -> bool:
        """Check if two issues are similar based on element + description."""
        # Same page URL check
        if a.page_url and b.page_url and a.page_url != b.page_url:
            return False

        # Element similarity
        el_a = (a.element or "").lower().strip()
        el_b = (b.element or "").lower().strip()
        if el_a and el_b and el_a != el_b:
            el_sim = SequenceMatcher(None, el_a, el_b).ratio()
            if el_sim < 0.5:
                return False

        # Description similarity
        desc_a = (a.description or "").lower().strip()
        desc_b = (b.description or "").lower().strip()
        if not desc_a or not desc_b:
            return False

        desc_sim = SequenceMatcher(None, desc_a[:200], desc_b[:200]).ratio()
        return desc_sim >= SIMILARITY_THRESHOLD
