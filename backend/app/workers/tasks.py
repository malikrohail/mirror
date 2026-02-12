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
        except Exception as e:
            await db.rollback()
            logger.error(f"Study {study_id} failed: {e}")
            raise

    logger.info(f"Study run complete: {study_id}")
