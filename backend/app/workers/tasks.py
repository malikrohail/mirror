"""Background task definitions for the arq worker.

Agent 2 will implement the actual AI/browser logic inside run_study_task.
"""

import logging
import uuid

logger = logging.getLogger(__name__)


async def run_study_task(ctx: dict, study_id: str):
    """Run a complete study — navigation + analysis pipeline.

    This is the main arq task dispatched by the study orchestrator.
    Agent 2 will fill in the actual implementation.

    Args:
        ctx: arq context with db_factory and redis connections.
        study_id: UUID string of the study to run.
    """
    db_factory = ctx["db_factory"]
    redis = ctx["redis"]

    logger.info(f"Starting study run: {study_id}")

    async with db_factory() as db:
        try:
            from app.core.orchestrator import StudyOrchestrator

            orchestrator = StudyOrchestrator(db, redis, db_factory=db_factory)
            await orchestrator.run_study(uuid.UUID(study_id))
            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Study %s failed", study_id)
            raise

    logger.info(f"Study run complete: {study_id}")


async def check_schedules_task(ctx: dict):
    """Periodic task — check for due schedules and trigger runs.

    This is called by arq's cron_jobs on a 1-minute interval.
    """
    db_factory = ctx["db_factory"]
    redis = ctx["redis"]

    async with db_factory() as db:
        try:
            from app.services.schedule_service import ScheduleService

            svc = ScheduleService(db, redis=redis)
            due = await svc.get_due_schedules()

            if not due:
                return

            logger.info("Found %d due schedules", len(due))
            for schedule in due:
                try:
                    study, job_id = await svc.trigger_run(schedule.id)
                    logger.info(
                        "Triggered schedule %s → study %s (job %s)",
                        schedule.id, study.id, job_id,
                    )
                except Exception:
                    logger.exception("Failed to trigger schedule %s", schedule.id)

            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Schedule check failed")
