import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_redis
from app.schemas.study import (
    StudyCreate,
    StudyList,
    StudyOut,
    StudyRunResponse,
    StudyStatusResponse,
    StudySummary,
)
from app.services.study_service import StudyService

router = APIRouter()


@router.post("", response_model=StudyOut, status_code=201)
async def create_study(
    data: StudyCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new study with tasks and personas."""
    svc = StudyService(db)
    study = await svc.create_study(data)
    return study


@router.get("", response_model=StudyList)
async def list_studies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List studies with pagination."""
    svc = StudyService(db)
    studies, total = await svc.list_studies(page=page, limit=limit, status=status)
    items = []
    for s in studies:
        summary = StudySummary.model_validate(s)
        summary.task_count = len(s.tasks) if s.tasks else 0
        summary.persona_count = len(s.personas) if s.personas else 0
        summary.first_task = s.tasks[0].description if s.tasks else None
        items.append(summary)
    return StudyList(
        items=items,
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{study_id}", response_model=StudyOut)
async def get_study(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get study with summary results."""
    svc = StudyService(db)
    return await svc.get_study(study_id)


@router.delete("/{study_id}", status_code=204)
async def delete_study(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a study and all associated data."""
    svc = StudyService(db)
    await svc.delete_study(study_id)


@router.post("/{study_id}/run", response_model=StudyRunResponse)
async def run_study(
    study_id: uuid.UUID,
    browser_mode: str | None = Query(None, pattern="^(local|cloud)$"),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Start running a study — dispatches to worker queue."""
    svc = StudyService(db, redis=redis)
    job_id = await svc.run_study(study_id, browser_mode=browser_mode)
    return StudyRunResponse(study_id=study_id, job_id=job_id)


@router.get("/{study_id}/status", response_model=StudyStatusResponse)
async def get_study_status(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Poll study progress."""
    svc = StudyService(db, redis=redis)
    return await svc.get_study_status(study_id)


@router.get("/{study_id}/live-state")
async def get_live_state(
    study_id: uuid.UUID,
    redis: aioredis.Redis = Depends(get_redis),
) -> dict:
    """Get durable live session state for real-time progress polling.

    Returns a snapshot of all active persona sessions with their current
    step, think-aloud, screenshot URL, live view URL, and browser status.
    Used by the running page as a reliable alternative to WebSocket.
    """
    from app.services.live_session_state import LiveSessionStateStore

    store = LiveSessionStateStore(redis)
    return await store.get_study_snapshot(str(study_id))


@router.get("/{study_id}/estimate")
async def estimate_study_cost(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Estimate the cost of running a study before execution."""
    from app.services.cost_estimator import CostEstimator
    estimator = CostEstimator(db)
    return await estimator.estimate(study_id)


@router.post("/browser/warm")
async def warm_browser(
    redis: aioredis.Redis = Depends(get_redis),
):
    """Pre-warm a Browserbase session while the user configures their study.

    Call this from the frontend when the user lands on the study setup page.
    The session ID is stored in Redis and reused when the study starts,
    saving 7-15 seconds of cold-start latency.
    """
    import os
    import httpx

    bb_api_key = os.getenv("BROWSERBASE_API_KEY", "")
    bb_project_id = os.getenv("BROWSERBASE_PROJECT_ID", "")

    if not bb_api_key or not bb_project_id:
        return {"status": "skipped", "reason": "Browserbase not configured"}

    # Check if we already have a warm session
    existing = await redis.get("browserbase:warm_session")
    if existing:
        return {"status": "ready", "session_id": existing}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.browserbase.com/v1/sessions",
                headers={
                    "x-bb-api-key": bb_api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "projectId": bb_project_id,
                    "browserSettings": {
                        "viewport": {"width": 1920, "height": 1080},
                    },
                },
            )
            resp.raise_for_status()
            session_data = resp.json()
            session_id = session_data.get("id", "")

            # Cache for 5 minutes (session expires after inactivity)
            await redis.setex("browserbase:warm_session", 300, session_id)

            return {"status": "warming", "session_id": session_id}
    except Exception as e:
        return {"status": "error", "reason": str(e)}
