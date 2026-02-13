"""Schedule CRUD and webhook endpoints."""

import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_redis
from app.schemas.schedule import (
    ScheduleCreate,
    ScheduleList,
    ScheduleOut,
    ScheduleRunResponse,
    ScheduleUpdate,
    WebhookTriggerResponse,
)
from app.services.schedule_service import ScheduleService

router = APIRouter()


@router.post("", response_model=ScheduleOut, status_code=201)
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    """Create a new schedule for recurring or webhook-triggered tests."""
    svc = ScheduleService(db)
    return await svc.create_schedule(data)


@router.get("", response_model=ScheduleList)
async def list_schedules(db: AsyncSession = Depends(get_db)):
    """List all non-deleted schedules."""
    svc = ScheduleService(db)
    schedules, total = await svc.list_schedules()
    return ScheduleList(items=[ScheduleOut.model_validate(s) for s in schedules], total=total)


@router.get("/{schedule_id}", response_model=ScheduleOut)
async def get_schedule(schedule_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get a schedule by ID."""
    svc = ScheduleService(db)
    return await svc.get_schedule(schedule_id)


@router.patch("/{schedule_id}", response_model=ScheduleOut)
async def update_schedule(schedule_id: uuid.UUID, data: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    """Update schedule fields."""
    svc = ScheduleService(db)
    return await svc.update_schedule(schedule_id, data)


@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Soft delete a schedule."""
    svc = ScheduleService(db)
    await svc.delete_schedule(schedule_id)


@router.post("/{schedule_id}/trigger", response_model=ScheduleRunResponse)
async def trigger_schedule(
    schedule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Manually trigger a schedule run."""
    svc = ScheduleService(db, redis=redis)
    study, job_id = await svc.trigger_run(schedule_id, db=db, redis=redis)
    return ScheduleRunResponse(schedule_id=schedule_id, study_id=study.id, job_id=job_id)


# ── Webhook endpoint ──────────────────────────────────

webhook_router = APIRouter()


@webhook_router.post("/deploy/{webhook_secret}", response_model=WebhookTriggerResponse)
async def webhook_trigger(
    webhook_secret: str,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """Webhook endpoint — triggers a schedule run by secret. No auth required."""
    svc = ScheduleService(db, redis=redis)
    schedule = await svc.get_schedule_by_webhook_secret(webhook_secret)
    study, job_id = await svc.trigger_run(schedule.id, db=db, redis=redis)
    return WebhookTriggerResponse(schedule_id=schedule.id, study_id=study.id, job_id=job_id)
