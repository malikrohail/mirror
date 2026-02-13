from __future__ import annotations

import uuid
from types import SimpleNamespace

import pytest

from app.services.session_service import SessionService


class _FakeRepo:
    def __init__(self, sessions: list[SimpleNamespace]) -> None:
        self._sessions = sessions

    async def list_sessions(self, _study_id: uuid.UUID):
        return self._sessions


class _FakeStateStore:
    def __init__(self, snapshot: dict[str, dict[str, object]]) -> None:
        self._snapshot = snapshot

    async def get_study_snapshot(self, _study_id: str):
        return self._snapshot


@pytest.mark.asyncio
async def test_list_sessions_merges_live_state_snapshot() -> None:
    study_id = uuid.uuid4()
    session_id = uuid.uuid4()
    sessions = [SimpleNamespace(id=session_id)]

    svc = SessionService(db=None)  # type: ignore[arg-type]
    svc.repo = _FakeRepo(sessions)  # type: ignore[assignment]
    svc._state_store = _FakeStateStore(
        {
            str(session_id): {
                "live_view_url": "https://browserbase.example/live",
                "browser_active": True,
            }
        }
    )

    result = await svc.list_sessions(study_id)

    assert result[0].live_view_url == "https://browserbase.example/live"
    assert result[0].browser_active is True
