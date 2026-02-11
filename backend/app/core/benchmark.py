"""Competitive benchmarking — run same personas on multiple sites and compare.

Creates linked studies for each URL and produces a cross-site comparison
showing how competitors stack up on the same tasks.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study import Study

logger = logging.getLogger(__name__)


class SiteScore(BaseModel):
    """Score summary for a single site in a benchmark."""

    url: str
    study_id: str
    overall_score: float | None = None
    total_issues: int = 0
    critical_issues: int = 0
    task_completion_rate: float = 0.0


class BenchmarkResult(BaseModel):
    """Result of a competitive benchmark across multiple sites."""

    benchmark_id: str
    sites: list[SiteScore] = Field(default_factory=list)
    winner: str | None = None
    summary: str = ""
    comparative_insights: list[str] = Field(default_factory=list)


class CompetitiveBenchmark:
    """Manages competitive benchmarking across multiple URLs."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_benchmark_studies(
        self,
        urls: list[str],
        tasks: list[dict[str, Any]],
        persona_template_ids: list[uuid.UUID],
        starting_path: str = "/",
    ) -> list[uuid.UUID]:
        """Create linked studies for each URL in the benchmark.

        Returns list of study IDs to be run.
        """
        from app.services.study_service import StudyService
        from app.schemas.study import StudyCreate, TaskCreate

        study_ids = []
        for url in urls:
            study_data = StudyCreate(
                url=url,
                starting_path=starting_path,
                tasks=[TaskCreate(**t) for t in tasks],
                persona_template_ids=persona_template_ids,
            )
            svc = StudyService(self.db)
            study = await svc.create_study(study_data)
            study_ids.append(study.id)

        return study_ids

    async def compare_results(
        self,
        study_ids: list[uuid.UUID],
    ) -> BenchmarkResult:
        """Compare completed studies and produce benchmark results."""
        from app.models.issue import Issue
        from app.models.session import Session, SessionStatus

        sites: list[SiteScore] = []
        benchmark_id = str(uuid.uuid4())

        for study_id in study_ids:
            study_result = await self.db.execute(
                select(Study).where(Study.id == study_id)
            )
            study = study_result.scalar_one_or_none()
            if not study:
                continue

            # Count issues
            issue_result = await self.db.execute(
                select(Issue).where(Issue.study_id == study_id)
            )
            issues = list(issue_result.scalars().all())
            critical_count = sum(
                1 for i in issues
                if (i.severity.value if hasattr(i.severity, "value") else str(i.severity)) == "critical"
            )

            # Task completion rate
            session_result = await self.db.execute(
                select(Session).where(Session.study_id == study_id)
            )
            sessions = list(session_result.scalars().all())
            total_sessions = len(sessions)
            completed_sessions = sum(
                1 for s in sessions if s.status == SessionStatus.COMPLETE
            )
            completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0

            sites.append(SiteScore(
                url=study.url,
                study_id=str(study_id),
                overall_score=study.overall_score,
                total_issues=len(issues),
                critical_issues=critical_count,
                task_completion_rate=round(completion_rate, 1),
            ))

        # Determine winner
        winner = None
        if sites:
            best = max(sites, key=lambda s: s.overall_score or 0)
            winner = best.url

        # Build summary
        summary_parts = [f"Benchmarked {len(sites)} sites."]
        if winner and len(sites) > 1:
            scores = sorted(sites, key=lambda s: s.overall_score or 0, reverse=True)
            summary_parts.append(
                f"Best: {scores[0].url} ({scores[0].overall_score:.0f}/100). "
                f"Worst: {scores[-1].url} ({scores[-1].overall_score:.0f}/100)."
            )

        # Comparative insights
        insights = []
        if len(sites) >= 2:
            sorted_sites = sorted(sites, key=lambda s: s.overall_score or 0, reverse=True)
            for i in range(len(sorted_sites) - 1):
                a, b = sorted_sites[i], sorted_sites[i + 1]
                delta = (a.overall_score or 0) - (b.overall_score or 0)
                if delta > 0:
                    insights.append(
                        f"{a.url} scores {delta:.0f} points higher than {b.url}"
                    )
                comp_delta = a.task_completion_rate - b.task_completion_rate
                if abs(comp_delta) > 10:
                    better = a.url if comp_delta > 0 else b.url
                    insights.append(
                        f"{better} has significantly higher task completion rate"
                    )

        return BenchmarkResult(
            benchmark_id=benchmark_id,
            sites=sites,
            winner=winner,
            summary=" ".join(summary_parts),
            comparative_insights=insights,
        )
