"""Longitudinal UX score tracking — query historical scores for a URL."""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study import Study, StudyStatus

logger = logging.getLogger(__name__)


class ScoreHistoryService:
    """Queries historical study scores for a given URL to show trends over time."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_score_history(self, url: str, limit: int = 50) -> dict:
        """Get historical scores for a URL."""
        normalized = self._normalize_url(url)

        stmt = (
            select(Study)
            .where(Study.status == StudyStatus.COMPLETE)
            .where(Study.url.ilike(f"%{normalized}%"))
            .order_by(Study.created_at.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        studies = list(result.scalars().all())

        if not studies:
            return {"url": url, "data_points": [], "total_studies": 0, "average_score": None, "trend": None, "score_delta": None}

        data_points = []
        scores = []
        for s in studies:
            data_points.append({
                "study_id": str(s.id),
                "score": s.overall_score,
                "status": s.status.value if hasattr(s.status, "value") else str(s.status),
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "schedule_id": str(s.schedule_id) if s.schedule_id else None,
            })
            if s.overall_score is not None:
                scores.append(s.overall_score)

        avg_score = sum(scores) / len(scores) if scores else None
        trend = None
        score_delta = None
        if len(scores) >= 2:
            score_delta = scores[-1] - scores[0]
            trend = "improving" if score_delta > 5 else ("declining" if score_delta < -5 else "stable")

        return {
            "url": url,
            "data_points": data_points,
            "total_studies": len(studies),
            "average_score": round(avg_score, 1) if avg_score else None,
            "trend": trend,
            "score_delta": round(score_delta, 1) if score_delta is not None else None,
        }

    async def get_url_list(self) -> list[dict]:
        """Get list of unique URLs that have been tested."""
        stmt = (
            select(
                Study.url,
                func.count(Study.id).label("study_count"),
                func.max(Study.overall_score).label("latest_score"),
                func.max(Study.created_at).label("last_tested"),
            )
            .where(Study.status == StudyStatus.COMPLETE)
            .group_by(Study.url)
            .order_by(func.max(Study.created_at).desc())
        )
        result = await self.db.execute(stmt)
        return [
            {"url": row.url, "study_count": row.study_count, "latest_score": row.latest_score, "last_tested": row.last_tested.isoformat() if row.last_tested else None}
            for row in result.all()
        ]

    @staticmethod
    def _normalize_url(url: str) -> str:
        url = url.strip().rstrip("/")
        for prefix in ("https://", "http://", "www."):
            if url.lower().startswith(prefix):
                url = url[len(prefix):]
        return url
