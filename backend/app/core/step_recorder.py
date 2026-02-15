"""DatabaseStepRecorder — persists navigation steps to DB and publishes events to Redis.

This bridges the navigation engine (Agent 2) with the infrastructure layer (Agent 1).
Every step's screenshot, think-aloud text, action, and UX issues are saved to the
database and broadcast via Redis PubSub for real-time WebSocket consumption.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.llm.schemas import NavigationDecision
from app.models.issue import Issue, IssueSeverity
from app.models.step import Step
from app.services.live_session_state import LiveSessionStateStore
from app.storage.file_storage import FileStorage

logger = logging.getLogger(__name__)


# Emotional state intensity for detecting dramatic shifts
_EMOTION_INTENSITY: dict[str, int] = {
    "confident": 5,
    "curious": 4,
    "neutral": 3,
    "hesitant": 2,
    "confused": 1,
    "frustrated": 0,
    "satisfied": 5,
    "anxious": 1,
}

EMOTIONAL_SHIFT_THRESHOLD = 3  # Minimum intensity delta to trigger a shift event


class DatabaseStepRecorder:
    """Concrete implementation of the StepRecorder protocol.

    Saves step data to PostgreSQL, screenshots to FileStorage,
    and publishes real-time events to Redis PubSub.
    """

    def __init__(
        self,
        db: AsyncSession,
        redis: aioredis.Redis,
        storage: FileStorage,
        study_id: uuid.UUID,
        session_id_to_study_session: dict[str, uuid.UUID] | None = None,
        live_view_url: str | None = None,
        state_store: LiveSessionStateStore | None = None,
    ) -> None:
        self.db = db
        self.redis = redis
        self.storage = storage
        self.study_id = study_id
        # Map navigator session_id strings to DB session UUIDs
        self._session_map = session_id_to_study_session or {}
        # Track previous emotional state per session for shift detection
        self._prev_emotions: dict[str, str] = {}
        self._live_view_url = live_view_url
        self._state_store = state_store
        # Lock to serialize DB writes — AsyncSession is not safe for concurrent use
        self._db_lock = asyncio.Lock()

    def _get_db_session_id(self, session_id: str) -> uuid.UUID:
        """Resolve navigator session_id string to DB UUID."""
        if session_id in self._session_map:
            return self._session_map[session_id]
        return uuid.UUID(session_id)

    async def save_step(
        self,
        session_id: str,
        step_number: int,
        screenshot: bytes,
        decision: NavigationDecision,
        page_url: str,
        page_title: str,
        viewport_width: int,
        viewport_height: int,
        click_x: int | None,
        click_y: int | None,
    ) -> None:
        """Save a navigation step to DB with screenshot and issues.

        1. Save screenshot bytes to FileStorage
        2. Create Step row in DB
        3. Create Issue rows for each UX issue found
        4. Flush transaction

        Uses a lock to serialize DB writes — background record tasks from
        the navigator run concurrently and AsyncSession is not safe for
        concurrent use.
        """
        db_session_id = self._get_db_session_id(session_id)

        # 1. Save screenshot (filesystem, no DB lock needed)
        screenshot_path = self.storage.save_screenshot(
            study_id=self.study_id,
            session_id=db_session_id,
            step_number=step_number,
            image_bytes=screenshot,
        )

        # 2-4. DB writes under lock to prevent concurrent session corruption
        async with self._db_lock:
            step = Step(
                session_id=db_session_id,
                step_number=step_number,
                page_url=page_url,
                page_title=page_title,
                screenshot_path=screenshot_path,
                think_aloud=decision.think_aloud,
                action_type=decision.action.type.value,
                action_selector=decision.action.selector,
                action_value=decision.action.value,
                confidence=decision.confidence,
                task_progress=decision.task_progress,
                emotional_state=decision.emotional_state.value,
                click_x=click_x,
                click_y=click_y,
                viewport_width=viewport_width,
                viewport_height=viewport_height,
            )
            self.db.add(step)
            await self.db.flush()

            for ux_issue in decision.ux_issues:
                severity_map = {
                    "critical": IssueSeverity.CRITICAL,
                    "major": IssueSeverity.MAJOR,
                    "minor": IssueSeverity.MINOR,
                    "enhancement": IssueSeverity.ENHANCEMENT,
                }
                issue = Issue(
                    step_id=step.id,
                    session_id=db_session_id,
                    study_id=self.study_id,
                    element=ux_issue.element,
                    description=ux_issue.description,
                    severity=severity_map.get(ux_issue.severity.value, IssueSeverity.MINOR),
                    heuristic=ux_issue.heuristic,
                    wcag_criterion=ux_issue.wcag_criterion,
                    recommendation=ux_issue.recommendation,
                    page_url=page_url,
                    issue_type=ux_issue.issue_type.value
                    if hasattr(ux_issue, "issue_type") and ux_issue.issue_type
                    else "ux",
                )
                self.db.add(issue)

            await self.db.flush()

        logger.info(
            "[step-recorder] Saved step %d for session %s (%d issues, screenshot=%s)",
            step_number, session_id, len(decision.ux_issues), screenshot_path,
        )

    async def publish_step_event(
        self,
        session_id: str,
        persona_name: str,
        step_number: int,
        decision: NavigationDecision,
        screenshot_url: str,
    ) -> None:
        """Publish a rich real-time step event to Redis PubSub.

        Includes enriched data for the live progress view: persona info,
        action details, emotional state, confidence, and UX issue count.
        Also detects and publishes emotional shift events.
        """
        channel = f"study:{self.study_id}"

        # Rich step event
        event = {
            "type": "session:step",
            "session_id": session_id,
            "persona_name": persona_name,
            "step_number": step_number,
            "think_aloud": decision.think_aloud,
            "screenshot_url": (
                f"/api/v1/screenshots/studies/{self.study_id}/sessions/{screenshot_url}"
            ),
            "emotional_state": decision.emotional_state.value,
            "action": {
                "type": decision.action.type.value,
                "description": decision.action.description,
                "selector": decision.action.selector,
            },
            "task_progress": decision.task_progress,
            "confidence": decision.confidence,
            "ux_issues_found": len(decision.ux_issues),
            "page_url": decision.action.description,
            "live_view_url": self._live_view_url,
        }
        await self.redis.publish(channel, json.dumps(event))
        if self._state_store:
            await self._state_store.upsert(
                study_id=str(self.study_id),
                session_id=session_id,
                updates={
                    "persona_name": persona_name,
                    "step_number": step_number,
                    "think_aloud": decision.think_aloud,
                    "screenshot_url": event["screenshot_url"],
                    "emotional_state": decision.emotional_state.value,
                    "action": event["action"],
                    "task_progress": decision.task_progress,
                    "completed": False,
                    "total_steps": step_number,
                    "browser_active": True,
                    "live_view_url": event.get("live_view_url"),
                },
            )

        logger.info(
            (
                "[live-view] Published step: study=%s session=%s step=%d "
                "live_view=%s"
            ),
            self.study_id,
            session_id,
            step_number,
            bool(event.get("live_view_url")),
        )

        # Detect dramatic emotional shifts
        current_emotion = decision.emotional_state.value
        prev_emotion = self._prev_emotions.get(session_id)
        self._prev_emotions[session_id] = current_emotion

        if prev_emotion and prev_emotion != current_emotion:
            prev_intensity = _EMOTION_INTENSITY.get(prev_emotion, 3)
            curr_intensity = _EMOTION_INTENSITY.get(current_emotion, 3)
            delta = abs(prev_intensity - curr_intensity)

            if delta >= EMOTIONAL_SHIFT_THRESHOLD:
                shift_event = {
                    "type": "session:emotional_shift",
                    "session_id": session_id,
                    "persona_name": persona_name,
                    "step_number": step_number,
                    "from_emotion": prev_emotion,
                    "to_emotion": current_emotion,
                    "intensity_delta": delta,
                    "think_aloud": decision.think_aloud,
                }
                await self.redis.publish(channel, json.dumps(shift_event))

        logger.debug(
            "Published step event: session=%s, step=%d", session_id, step_number,
        )
