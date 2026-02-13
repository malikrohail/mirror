"""Longitudinal score history endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.score_history_service import ScoreHistoryService

router = APIRouter()


@router.get("/history/urls")
async def list_tracked_urls(db: AsyncSession = Depends(get_db)) -> list[dict]:
    """List all URLs that have been tested, with study count and latest score."""
    svc = ScoreHistoryService(db)
    return await svc.get_url_list()


@router.get("/history/scores")
async def get_score_history(
    url: str = Query(..., description="The URL to get history for"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get longitudinal score history for a URL."""
    svc = ScoreHistoryService(db)
    return await svc.get_score_history(url=url, limit=limit)
