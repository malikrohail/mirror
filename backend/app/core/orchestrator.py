"""Study orchestrator — manages study lifecycle and dispatches work to workers.

This module handles:
- Study status transitions: setup → running → analyzing → complete
- Timeout handling
- Progress tracking (aggregates per-session progress)
- Publishing events to Redis for WebSocket consumption

The actual AI/browser logic is implemented by Agent 2 in the worker tasks.
"""

import asyncio
import json
import logging
import uuid

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.repositories.session_repo import SessionRepository
from app.db.repositories.study_repo import StudyRepository
from app.models.session import SessionStatus
from app.models.study import StudyStatus

logger = logging.getLogger(__name__)


class StudyOrchestrator:
    """Manages the lifecycle of a study run."""

    def __init__(self, db: AsyncSession, redis: aioredis.Redis):
        self.db = db
        self.redis = redis
        self.study_repo = StudyRepository(db)
        self.session_repo = SessionRepository(db)

    async def run_study(self, study_id: uuid.UUID):
        """Main entry point for running a study.

        This is called by the arq worker task. The actual navigation
        logic is implemented by Agent 2.
        """
        study = await self.study_repo.get_with_all(study_id)
        if not study:
            logger.error(f"Study {study_id} not found")
            return

        try:
            # Update to running
            await self.study_repo.update_status(study_id, StudyStatus.RUNNING)
            await self._publish_progress(study_id, 0, "running")

            # The actual navigation happens here — Agent 2 implements this
            # For now, this is a stub that marks sessions as pending
            logger.info(
                f"Study {study_id}: {len(study.sessions)} sessions to run "
                f"(stub — Agent 2 implements navigation)"
            )

            # Transition to analyzing phase
            await self.study_repo.update_status(study_id, StudyStatus.ANALYZING)
            await self._publish_progress(study_id, 80, "analyzing")

            # Agent 2 will implement the analysis pipeline here

            # Mark complete
            await self.study_repo.update_status(study_id, StudyStatus.COMPLETE)
            await self._publish_event(study_id, {
                "type": "study:complete",
                "study_id": str(study_id),
                "score": study.overall_score or 0,
                "issues_count": len(study.issues),
            })

        except asyncio.TimeoutError:
            logger.error(f"Study {study_id} timed out")
            await self.study_repo.update_status(study_id, StudyStatus.FAILED)
            await self._publish_event(study_id, {
                "type": "study:error",
                "study_id": str(study_id),
                "error": "Study timed out",
            })
        except Exception as e:
            logger.error(f"Study {study_id} failed: {e}")
            await self.study_repo.update_status(study_id, StudyStatus.FAILED)
            await self._publish_event(study_id, {
                "type": "study:error",
                "study_id": str(study_id),
                "error": str(e),
            })

    async def update_progress(self, study_id: uuid.UUID):
        """Aggregate session progress into study-level progress."""
        sessions = await self.session_repo.list_sessions(study_id)
        if not sessions:
            return

        total = len(sessions)
        completed = sum(
            1 for s in sessions if s.status in (SessionStatus.COMPLETE, SessionStatus.GAVE_UP)
        )
        failed = sum(1 for s in sessions if s.status == SessionStatus.FAILED)

        percent = ((completed + failed) / total) * 70  # 70% for navigation, 30% for analysis
        await self._publish_progress(study_id, percent, "navigating")

    async def _publish_progress(self, study_id: uuid.UUID, percent: float, phase: str):
        """Publish study progress to Redis."""
        await self.redis.set(f"study:{study_id}:progress", str(percent))
        await self._publish_event(study_id, {
            "type": "study:progress",
            "study_id": str(study_id),
            "percent": percent,
            "phase": phase,
        })

    async def _publish_event(self, study_id: uuid.UUID, event: dict):
        """Publish an event to the Redis PubSub channel for this study."""
        channel = f"study:{study_id}"
        await self.redis.publish(channel, json.dumps(event))
