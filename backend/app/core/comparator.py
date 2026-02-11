"""Before/after study comparison — diff analysis between two study runs.

Compares scores, issues fixed, issues introduced, and persona-level
changes between a baseline study and a new study on the same site.
"""

from __future__ import annotations

import logging
import uuid
from difflib import SequenceMatcher
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.issue import Issue
from app.models.study import Study

logger = logging.getLogger(__name__)


class IssueDiff(BaseModel):
    """A single issue difference between two studies."""
    element: str | None = None
    description: str
    severity: str
    page_url: str | None = None
    status: str  # "fixed", "new", "persisting", "improved", "regressed"


class ComparisonResult(BaseModel):
    """Result of comparing two study runs."""
    baseline_study_id: str
    comparison_study_id: str
    baseline_score: float | None = None
    comparison_score: float | None = None
    score_delta: float = 0
    score_improved: bool = False

    issues_fixed: list[IssueDiff] = Field(default_factory=list)
    issues_new: list[IssueDiff] = Field(default_factory=list)
    issues_persisting: list[IssueDiff] = Field(default_factory=list)

    total_baseline_issues: int = 0
    total_comparison_issues: int = 0

    summary: str = ""


class StudyComparator:
    """Compares two study runs to produce a diff analysis."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def compare(
        self,
        baseline_id: uuid.UUID,
        comparison_id: uuid.UUID,
    ) -> ComparisonResult:
        """Compare two studies and return the delta analysis.

        Args:
            baseline_id: The "before" study.
            comparison_id: The "after" study.

        Returns:
            ComparisonResult with score delta, fixed/new/persisting issues.
        """
        # Load both studies
        baseline = await self._load_study(baseline_id)
        comparison = await self._load_study(comparison_id)

        if not baseline or not comparison:
            return ComparisonResult(
                baseline_study_id=str(baseline_id),
                comparison_study_id=str(comparison_id),
                summary="One or both studies not found.",
            )

        # Load issues
        baseline_issues = await self._load_issues(baseline_id)
        comparison_issues = await self._load_issues(comparison_id)

        # Classify issues
        fixed, new, persisting = self._classify_issues(baseline_issues, comparison_issues)

        # Calculate score delta
        base_score = baseline.overall_score or 0
        comp_score = comparison.overall_score or 0
        delta = comp_score - base_score

        # Build summary
        summary_parts = []
        if delta > 0:
            summary_parts.append(f"UX score improved by {delta:.0f} points ({base_score:.0f} → {comp_score:.0f}).")
        elif delta < 0:
            summary_parts.append(f"UX score decreased by {abs(delta):.0f} points ({base_score:.0f} → {comp_score:.0f}).")
        else:
            summary_parts.append(f"UX score unchanged at {base_score:.0f}.")

        if fixed:
            summary_parts.append(f"{len(fixed)} issues fixed.")
        if new:
            summary_parts.append(f"{len(new)} new issues introduced.")
        if persisting:
            summary_parts.append(f"{len(persisting)} issues still present.")

        return ComparisonResult(
            baseline_study_id=str(baseline_id),
            comparison_study_id=str(comparison_id),
            baseline_score=base_score,
            comparison_score=comp_score,
            score_delta=delta,
            score_improved=delta > 0,
            issues_fixed=fixed,
            issues_new=new,
            issues_persisting=persisting,
            total_baseline_issues=len(baseline_issues),
            total_comparison_issues=len(comparison_issues),
            summary=" ".join(summary_parts),
        )

    async def _load_study(self, study_id: uuid.UUID) -> Study | None:
        result = await self.db.execute(
            select(Study).where(Study.id == study_id)
        )
        return result.scalar_one_or_none()

    async def _load_issues(self, study_id: uuid.UUID) -> list[Issue]:
        result = await self.db.execute(
            select(Issue).where(Issue.study_id == study_id)
        )
        return list(result.scalars().all())

    def _classify_issues(
        self,
        baseline_issues: list[Issue],
        comparison_issues: list[Issue],
    ) -> tuple[list[IssueDiff], list[IssueDiff], list[IssueDiff]]:
        """Classify issues as fixed, new, or persisting."""
        fixed: list[IssueDiff] = []
        new: list[IssueDiff] = []
        persisting: list[IssueDiff] = []

        matched_comparison = set()

        for base_issue in baseline_issues:
            match_found = False
            for j, comp_issue in enumerate(comparison_issues):
                if j in matched_comparison:
                    continue
                if self._are_similar(base_issue, comp_issue):
                    matched_comparison.add(j)
                    match_found = True
                    persisting.append(IssueDiff(
                        element=comp_issue.element,
                        description=comp_issue.description,
                        severity=comp_issue.severity.value if hasattr(comp_issue.severity, "value") else str(comp_issue.severity),
                        page_url=comp_issue.page_url,
                        status="persisting",
                    ))
                    break

            if not match_found:
                fixed.append(IssueDiff(
                    element=base_issue.element,
                    description=base_issue.description,
                    severity=base_issue.severity.value if hasattr(base_issue.severity, "value") else str(base_issue.severity),
                    page_url=base_issue.page_url,
                    status="fixed",
                ))

        for j, comp_issue in enumerate(comparison_issues):
            if j not in matched_comparison:
                new.append(IssueDiff(
                    element=comp_issue.element,
                    description=comp_issue.description,
                    severity=comp_issue.severity.value if hasattr(comp_issue.severity, "value") else str(comp_issue.severity),
                    page_url=comp_issue.page_url,
                    status="new",
                ))

        return fixed, new, persisting

    @staticmethod
    def _are_similar(a: Issue, b: Issue) -> bool:
        """Check if two issues describe the same problem."""
        if a.page_url and b.page_url and a.page_url != b.page_url:
            return False

        el_a = (a.element or "").lower().strip()
        el_b = (b.element or "").lower().strip()
        if el_a and el_b:
            el_sim = SequenceMatcher(None, el_a, el_b).ratio()
            if el_sim < 0.5:
                return False

        desc_a = (a.description or "").lower().strip()[:200]
        desc_b = (b.description or "").lower().strip()[:200]
        if not desc_a or not desc_b:
            return False

        return SequenceMatcher(None, desc_a, desc_b).ratio() >= 0.6
