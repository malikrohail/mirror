"""Tests for Redis-backed live session state storage."""

from __future__ import annotations

import json

import pytest

from app.services.live_session_state import LiveSessionStateStore


class _FakeRedis:
    def __init__(self) -> None:
        self.hashes: dict[str, dict[str, str]] = {}
        self.expirations: dict[str, int] = {}

    async def hget(self, key: str, field: str) -> str | None:
        return self.hashes.get(key, {}).get(field)

    async def hset(self, key: str, field: str, value: str) -> None:
        self.hashes.setdefault(key, {})[field] = value

    async def hgetall(self, key: str) -> dict[str, str]:
        return dict(self.hashes.get(key, {}))

    async def expire(self, key: str, ttl_seconds: int) -> None:
        self.expirations[key] = ttl_seconds

    async def delete(self, key: str) -> int:
        existed = key in self.hashes
        self.hashes.pop(key, None)
        self.expirations.pop(key, None)
        return 1 if existed else 0


@pytest.mark.asyncio
async def test_upsert_preserves_existing_live_view_url_on_null_updates() -> None:
    redis = _FakeRedis()
    store = LiveSessionStateStore(redis)
    study_id = "study-1"
    session_id = "session-1"

    first = await store.upsert(
        study_id=study_id,
        session_id=session_id,
        updates={
            "persona_name": "Patricia",
            "live_view_url": "https://live.browserbase.example/session-1",
            "browser_active": True,
        },
    )
    assert first["live_view_url"] == "https://live.browserbase.example/session-1"

    second = await store.upsert(
        study_id=study_id,
        session_id=session_id,
        updates={
            "step_number": 2,
            "live_view_url": None,
        },
    )
    assert second["step_number"] == 2
    assert second["live_view_url"] == "https://live.browserbase.example/session-1"


@pytest.mark.asyncio
async def test_get_study_snapshot_returns_all_sessions() -> None:
    redis = _FakeRedis()
    store = LiveSessionStateStore(redis)
    study_id = "study-2"

    await store.upsert(
        study_id=study_id,
        session_id="session-a",
        updates={"persona_name": "A", "browser_active": True},
    )
    await store.upsert(
        study_id=study_id,
        session_id="session-b",
        updates={"persona_name": "B", "browser_active": False},
    )

    snapshot = await store.get_study_snapshot(study_id)

    assert set(snapshot.keys()) == {"session-a", "session-b"}
    assert snapshot["session-a"]["persona_name"] == "A"
    assert snapshot["session-b"]["browser_active"] is False

    key = "study:study-2:live-sessions"
    assert key in redis.expirations
    assert redis.expirations[key] > 0


@pytest.mark.asyncio
async def test_get_study_snapshot_skips_corrupt_json_entries() -> None:
    redis = _FakeRedis()
    key = "study:study-3:live-sessions"
    redis.hashes[key] = {
        "session-good": json.dumps({"session_id": "session-good", "step_number": 1}),
        "session-bad": "{not-json",
    }
    store = LiveSessionStateStore(redis)

    snapshot = await store.get_study_snapshot("study-3")

    assert "session-good" in snapshot
    assert "session-bad" not in snapshot


@pytest.mark.asyncio
async def test_clear_study_removes_durable_state() -> None:
    redis = _FakeRedis()
    store = LiveSessionStateStore(redis)
    study_id = "study-4"

    await store.upsert(
        study_id=study_id,
        session_id="session-z",
        updates={"persona_name": "Z", "browser_active": True},
    )
    await store.clear_study(study_id)

    snapshot = await store.get_study_snapshot(study_id)
    assert snapshot == {}
