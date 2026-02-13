"""Schedule service — CRUD + trigger logic for scheduled/continuous testing."""

from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule, ScheduleStatus
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate

logger = logging.getLogger(__name__)

try:
    from croniter import croniter
except ImportError:
    croniter = None


class ScheduleService:
    """Business logic for scheduled and webhook-triggered tests."""

    def __init__(self, db: AsyncSession, redis: aioredis.Redis | None = None) -> None:
        self.db = db
        self.redis = redis

    async def create_schedule(self, data: ScheduleCreate) -> Schedule:
        """Create a new schedule with a generated webhook secret."""
        schedule = Schedule(
            id=uuid.uuid4(),
            name=data.name,
            url=data.url,
            starting_path=data.starting_path,
            tasks=[t.model_dump() for t in data.tasks],
            persona_template_ids=[str(tid) for tid in data.persona_template_ids],
            cron_expression=data.cron_expression,
            webhook_secret=secrets.token_urlsafe(32),
            status=ScheduleStatus.ACTIVE,
            next_run_at=self._compute_next_run(data.cron_expression),
        )
        self.db.add(schedule)
        await self.db.flush()
        await self.db.refresh(schedule)
        await self.db.commit()
        return schedule

    async def list_schedules(self) -> tuple[list[Schedule], int]:
        """List all non-deleted schedules."""
        stmt = select(Schedule).where(Schedule.status != ScheduleStatus.DELETED).order_by(Schedule.created_at.desc())
        result = await self.db.execute(stmt)
        schedules = list(result.scalars().all())
        return schedules, len(schedules)

    async def get_schedule(self, schedule_id: uuid.UUID) -> Schedule:
        """Get a schedule by ID."""
        result = await self.db.execute(select(Schedule).where(Schedule.id == schedule_id))
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        return schedule

    async def get_schedule_by_webhook_secret(self, secret: str) -> Schedule:
        """Get a schedule by webhook secret."""
        result = await self.db.execute(
            select(Schedule).where(Schedule.webhook_secret == secret, Schedule.status == ScheduleStatus.ACTIVE)
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            raise HTTPException(status_code=404, detail="Invalid webhook secret or schedule not active")
        return schedule

    async def update_schedule(self, schedule_id: uuid.UUID, data: ScheduleUpdate) -> Schedule:
        """Update schedule fields."""
        schedule = await self.get_schedule(schedule_id)
        if data.name is not None:
            schedule.name = data.name
        if data.cron_expression is not None:
            schedule.cron_expression = data.cron_expression
            schedule.next_run_at = self._compute_next_run(data.cron_expression)
        if data.status is not None:
            schedule.status = ScheduleStatus(data.status)
        if data.tasks is not None:
            schedule.tasks = [t.model_dump() for t in data.tasks]
        if data.persona_template_ids is not None:
            schedule.persona_template_ids = [str(tid) for tid in data.persona_template_ids]
        await self.db.flush()
        await self.db.refresh(schedule)
        await self.db.commit()
        return schedule

    async def delete_schedule(self, schedule_id: uuid.UUID) -> None:
        """Soft delete a schedule."""
        schedule = await self.get_schedule(schedule_id)
        schedule.status = ScheduleStatus.DELETED
        await self.db.flush()
        await self.db.commit()

    async def trigger_run(self, schedule_id: uuid.UUID, db: AsyncSession | None = None, redis: aioredis.Redis | None = None) -> tuple:
        """Create a new study from the schedule config and dispatch it."""
        from app.schemas.study import StudyCreate, TaskCreate
        from app.services.study_service import StudyService

        effective_db = db or self.db
        effective_redis = redis or self.redis

        schedule = await self.get_schedule(schedule_id)
        if schedule.status != ScheduleStatus.ACTIVE:
            raise HTTPException(status_code=400, detail=f"Schedule is '{schedule.status.value}', not active")

        tasks = [
            TaskCreate(description=t.get("description", ""), order_index=t.get("order_index", i))
            for i, t in enumerate(schedule.tasks)
        ]
        study_data = StudyCreate(
            url=schedule.url,
            starting_path=schedule.starting_path,
            tasks=tasks,
            persona_template_ids=schedule.persona_template_ids,
        )

        study_svc = StudyService(effective_db, redis=effective_redis)
        study = await study_svc.create_study(study_data)
        study.schedule_id = schedule.id
        await effective_db.flush()

        job_id = await study_svc.run_study(study.id)

        now = datetime.now(timezone.utc)
        schedule.last_run_at = now
        schedule.last_study_id = study.id
        schedule.run_count = (schedule.run_count or 0) + 1
        schedule.next_run_at = self._compute_next_run(schedule.cron_expression)
        await self.db.flush()
        await self.db.commit()

        logger.info("Schedule %s triggered: study=%s job=%s run_count=%d", schedule_id, study.id, job_id, schedule.run_count)
        return study, job_id

    async def get_due_schedules(self) -> list[Schedule]:
        """Find schedules where status=active AND next_run_at <= now."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Schedule).where(
                Schedule.status == ScheduleStatus.ACTIVE,
                Schedule.next_run_at.isnot(None),
                Schedule.next_run_at <= now,
            )
        )
        return list(result.scalars().all())

    @staticmethod
    def _compute_next_run(cron_expression: str | None) -> datetime | None:
        """Compute the next run time from a cron expression."""
        if not cron_expression or croniter is None:
            return None
        try:
            cron = croniter(cron_expression, datetime.now(timezone.utc))
            return cron.get_next(datetime)
        except (ValueError, KeyError):
            logger.warning("Invalid cron expression: %s", cron_expression)
            return None
