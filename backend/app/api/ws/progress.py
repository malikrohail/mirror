import asyncio
import json
import logging

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.dependencies import get_redis
from app.services.live_session_state import LiveSessionStateStore

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and Redis PubSub subscriptions."""

    def __init__(self):
        # study_id -> set of websocket connections
        self.connections: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, study_id: str):
        await websocket.accept()
        if study_id not in self.connections:
            self.connections[study_id] = set()
        self.connections[study_id].add(websocket)
        logger.info(f"WebSocket connected for study {study_id}")

    def disconnect(self, websocket: WebSocket, study_id: str):
        if study_id in self.connections:
            self.connections[study_id].discard(websocket)
            if not self.connections[study_id]:
                del self.connections[study_id]
        logger.info(f"WebSocket disconnected for study {study_id}")

    async def broadcast(self, study_id: str, message: dict):
        """Send a message to all connections subscribed to a study."""
        if study_id in self.connections:
            dead = set()
            for ws in self.connections[study_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.connections[study_id].discard(ws)


manager = ConnectionManager()


@router.websocket("/api/v1/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time study progress.

    Client sends: {"type": "subscribe", "study_id": "..."}
    Server forwards all Redis PubSub messages for that study.
    """
    await websocket.accept()
    study_id: str | None = None
    redis_conn: aioredis.Redis | None = None
    pubsub = None
    listener_task = None
    state_store: LiveSessionStateStore | None = None

    async def send_snapshot(target_study_id: str) -> None:
        """Push durable session state snapshot to a newly subscribed client."""
        if state_store is None:
            return
        snapshot = await state_store.get_study_snapshot(target_study_id)
        await websocket.send_json(
            {
                "type": "study:session_snapshot",
                "study_id": target_study_id,
                "sessions": snapshot,
            }
        )
        logger.info(
            "[live-view] WS snapshot sent: study=%s sessions=%d",
            target_study_id,
            len(snapshot),
        )

    try:
        # Wait for subscribe message
        data = await websocket.receive_json()
        if data.get("type") != "subscribe" or "study_id" not in data:
            await websocket.send_json({"type": "error", "message": "Send subscribe first"})
            await websocket.close()
            return

        study_id = str(data["study_id"])
        manager.connections.setdefault(study_id, set())
        manager.connections[study_id].add(websocket)

        # Subscribe to Redis PubSub channel
        redis_conn = await get_redis()
        state_store = LiveSessionStateStore(redis_conn)
        pubsub = redis_conn.pubsub()
        await pubsub.subscribe(f"study:{study_id}")
        logger.info("[live-view] WS subscribed: study=%s", study_id)
        await send_snapshot(study_id)

        async def listen_redis():
            """Forward Redis PubSub messages to the WebSocket client."""
            try:
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        payload = json.loads(message["data"])
                        msg_type = payload.get("type", "unknown")
                        if msg_type in {
                            "session:live_view",
                            "session:step",
                            "session:browser_closed",
                        }:
                            logger.info(
                                "[live-view] WS forwarding message: study=%s type=%s",
                                study_id,
                                msg_type,
                            )
                        await websocket.send_json(payload)
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning(f"Redis listener error: {e}")

        listener_task = asyncio.create_task(listen_redis())

        # Keep connection alive, handle client messages
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "unsubscribe":
                break
            elif msg_type == "subscribe" and "study_id" in data:
                # Switch subscription
                old_id = study_id
                study_id = str(data["study_id"])

                if old_id in manager.connections:
                    manager.connections[old_id].discard(websocket)

                manager.connections.setdefault(study_id, set())
                manager.connections[study_id].add(websocket)

                await pubsub.unsubscribe(f"study:{old_id}")
                await pubsub.subscribe(f"study:{study_id}")
                logger.info(
                    "[live-view] WS switched subscription: old_study=%s new_study=%s",
                    old_id,
                    study_id,
                )
                await send_snapshot(study_id)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if listener_task:
            listener_task.cancel()
            try:
                await listener_task
            except asyncio.CancelledError:
                pass
        if pubsub:
            await pubsub.unsubscribe()
            await pubsub.close()
        if study_id:
            manager.disconnect(websocket, study_id)


async def publish_event(redis: aioredis.Redis, study_id: str, event: dict):
    """Helper to publish a WebSocket event via Redis PubSub."""
    channel = f"study:{study_id}"
    await redis.publish(channel, json.dumps(event))
