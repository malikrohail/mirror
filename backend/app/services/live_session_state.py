"""Durable live session state in Redis for WebSocket reconnect recovery."""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

LIVE_SESSION_STATE_TTL_SECONDS = 60 * 60 * 6  # 6 hours


class LiveSessionStateStore:
    """Persists per-session live state so reconnecting clients get a snapshot."""

    def __init__(
        self,
        redis: aioredis.Redis,
        ttl_seconds: int = LIVE_SESSION_STATE_TTL_SECONDS,
    ) -> None:
        self._redis = redis
        self._ttl_seconds = ttl_seconds

    @staticmethod
    def _key(study_id: str) -> str:
        return f"study:{study_id}:live-sessions"

    async def upsert(
        self,
        study_id: str,
        session_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        """Merge updates into existing state and persist.

        `live_view_url` is write-once unless a new non-empty URL is provided.
        This prevents accidental null/empty overwrite of a valid URL.
        """
        key = self._key(study_id)
        raw = await self._redis.hget(key, session_id)
        current: dict[str, Any] = {}

        if raw:
            try:
                current = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning(
                    "[live-view] Invalid Redis session state JSON, resetting: study=%s session=%s",
                    study_id,
                    session_id,
                )

        merged = dict(current)
        merged["session_id"] = session_id

        incoming_live_view = updates.get("live_view_url")
        if incoming_live_view:
            merged["live_view_url"] = incoming_live_view
        elif "live_view_url" not in merged and "live_view_url" in updates:
            merged["live_view_url"] = None

        for key_name, value in updates.items():
            if key_name == "live_view_url":
                continue
            if value is not None:
                merged[key_name] = value

        await self._redis.hset(key, session_id, json.dumps(merged))
        await self._redis.expire(key, self._ttl_seconds)

        logger.info(
            (
                "[live-view] State upsert: study=%s session=%s "
                "step=%s live_view=%s browser_active=%s"
            ),
            study_id,
            session_id,
            merged.get("step_number"),
            bool(merged.get("live_view_url")),
            merged.get("browser_active"),
        )
        return merged

    async def get_study_snapshot(self, study_id: str) -> dict[str, dict[str, Any]]:
        """Return all session states for a study."""
        key = self._key(study_id)
        rows = await self._redis.hgetall(key)
        snapshot: dict[str, dict[str, Any]] = {}

        for session_id, payload in rows.items():
            try:
                state = json.loads(payload)
                if isinstance(state, dict):
                    snapshot[session_id] = state
            except json.JSONDecodeError:
                logger.warning(
                    "[live-view] Skipping corrupt session state: study=%s session=%s",
                    study_id,
                    session_id,
                )

        logger.info(
            "[live-view] Snapshot loaded: study=%s sessions=%d",
            study_id,
            len(snapshot),
        )
        return snapshot

    async def clear_study(self, study_id: str) -> None:
        """Clear all durable session state for a study.

        This is used when re-running a study so stale session data from prior runs
        does not leak into the new live progress UI.
        """
        key = self._key(study_id)
        deleted = await self._redis.delete(key)
        logger.info(
            "[live-view] Cleared study state: study=%s deleted=%s",
            study_id,
            bool(deleted),
        )
