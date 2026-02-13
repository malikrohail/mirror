"""Unit tests for DatabaseStepRecorder event payloads."""

from __future__ import annotations

import json
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.step_recorder import DatabaseStepRecorder


def _mock_decision() -> SimpleNamespace:
    """Build a minimal decision object needed by publish_step_event."""
    return SimpleNamespace(
        think_aloud="I want to click the signup button.",
        emotional_state=SimpleNamespace(value="curious"),
        action=SimpleNamespace(
            type=SimpleNamespace(value="click"),
            description="Clicked the signup button",
            selector="#signup",
        ),
        task_progress=25,
        confidence=0.82,
        ux_issues=[],
    )


@pytest.mark.asyncio
async def test_publish_step_event_includes_live_view_url() -> None:
    """Step events should include live_view_url when recorder was configured with one."""
    redis = AsyncMock()
    state_store = AsyncMock()
    recorder = DatabaseStepRecorder(
        db=MagicMock(),
        redis=redis,
        storage=MagicMock(),
        study_id=uuid.uuid4(),
        live_view_url="https://live.browserbase.example/session",
        state_store=state_store,
    )

    await recorder.publish_step_event(
        session_id=str(uuid.uuid4()),
        persona_name="Tester",
        step_number=1,
        decision=_mock_decision(),
        screenshot_url="session-id/steps/step_001.png",
    )

    redis.publish.assert_awaited_once()
    _, payload = redis.publish.await_args.args
    event = json.loads(payload)
    assert event["type"] == "session:step"
    assert event["live_view_url"] == "https://live.browserbase.example/session"
    state_store.upsert.assert_awaited_once()


@pytest.mark.asyncio
async def test_publish_step_event_omits_live_view_url_when_not_configured() -> None:
    """Step events should not include live_view_url in local-browser mode."""
    redis = AsyncMock()
    state_store = AsyncMock()
    recorder = DatabaseStepRecorder(
        db=MagicMock(),
        redis=redis,
        storage=MagicMock(),
        study_id=uuid.uuid4(),
        state_store=state_store,
    )

    await recorder.publish_step_event(
        session_id=str(uuid.uuid4()),
        persona_name="Tester",
        step_number=1,
        decision=_mock_decision(),
        screenshot_url="session-id/steps/step_001.png",
    )

    redis.publish.assert_awaited_once()
    _, payload = redis.publish.await_args.args
    event = json.loads(payload)
    assert event["type"] == "session:step"
    assert event["live_view_url"] is None
    state_store.upsert.assert_awaited_once()
