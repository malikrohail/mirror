import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_redis
from app.schemas.session import (
    HeatmapResponse,
    InsightOut,
    IssueOut,
    SessionDetail,
    SessionOut,
    StepOut,
)
from app.services.session_service import SessionService

router = APIRouter()


@router.get("/studies/{study_id}/sessions", response_model=list[SessionOut])
async def list_sessions(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """List all sessions for a study."""
    svc = SessionService(db, redis=redis)
    return await svc.list_sessions(study_id)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get session detail with steps and issues."""
    svc = SessionService(db)
    return await svc.get_session(session_id)


@router.get("/sessions/{session_id}/steps", response_model=list[StepOut])
async def get_steps(
    session_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get all steps for a session."""
    svc = SessionService(db)
    return await svc.get_steps(session_id, page=page, limit=limit)


@router.get("/sessions/{session_id}/steps/{step_number}", response_model=StepOut)
async def get_step(
    session_id: uuid.UUID,
    step_number: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a single step."""
    svc = SessionService(db)
    return await svc.get_step(session_id, step_number)


@router.get("/studies/{study_id}/issues", response_model=list[IssueOut])
async def list_issues(
    study_id: uuid.UUID,
    severity: str | None = None,
    issue_type: str | None = None,
    persona_id: uuid.UUID | None = None,
    page_url: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List issues for a study with optional filters."""
    svc = SessionService(db)
    return await svc.list_issues(
        study_id,
        severity=severity,
        issue_type=issue_type,
        persona_id=persona_id,
        page_url=page_url,
    )


@router.get("/studies/{study_id}/insights", response_model=list[InsightOut])
async def get_insights(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get synthesized insights for a study."""
    svc = SessionService(db)
    return await svc.get_insights(study_id)


@router.get("/studies/{study_id}/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    study_id: uuid.UUID,
    page_url: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get heatmap click data for a study."""
    svc = SessionService(db)
    return await svc.get_heatmap_data(study_id, page_url=page_url)
