"""Binary WebSocket endpoint for real-time CDP screencast streaming.

Clients connect, send JSON subscribe/unsubscribe messages, and receive
raw binary frames. Frame format: [36 bytes session_id ASCII] + [JPEG bytes].

Supports up to 5 concurrent session subscriptions per client.
"""

from __future__ import annotations

import asyncio
import logging

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.browser.screencast import get_binary_redis

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_SUBSCRIPTIONS_PER_CLIENT = 5


@router.websocket("/api/v1/ws/screencast")
async def screencast_ws(websocket: WebSocket) -> None:
    """Binary WebSocket for streaming CDP screencast frames.

    Protocol:
    - Client sends JSON: ``{"type": "subscribe", "session_id": "uuid"}``
    - Client sends JSON: ``{"type": "unsubscribe", "session_id": "uuid"}``
    - Server sends binary: ``[36-byte session_id] + [JPEG bytes]``
    """
    await websocket.accept()

    binary_redis: aioredis.Redis | None = None
    pubsub: aioredis.client.PubSub | None = None
    listener_task: asyncio.Task | None = None
    subscribed_channels: set[str] = set()

    try:
        binary_redis = await get_binary_redis()
        pubsub = binary_redis.pubsub()

        async def listen_and_forward() -> None:
            """Read from Redis PubSub and forward binary frames to WebSocket."""
            assert pubsub is not None
            try:
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        # message["data"] is raw bytes (binary Redis pool)
                        frame_data: bytes = message["data"]
                        try:
                            await websocket.send_bytes(frame_data)
                        except Exception:
                            break
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.warning("Screencast Redis listener error: %s", e)

        listener_task = asyncio.create_task(listen_and_forward())

        # Handle client messages (subscribe/unsubscribe)
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "subscribe":
                session_id = data.get("session_id", "")
                if not session_id:
                    continue
                channel = f"screencast:{session_id}"
                if channel in subscribed_channels:
                    continue
                if len(subscribed_channels) >= MAX_SUBSCRIPTIONS_PER_CLIENT:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Max {MAX_SUBSCRIPTIONS_PER_CLIENT} subscriptions",
                    })
                    continue
                await pubsub.subscribe(channel)
                subscribed_channels.add(channel)
                logger.debug("Screencast WS subscribed: session=%s", session_id)

            elif msg_type == "unsubscribe":
                session_id = data.get("session_id", "")
                channel = f"screencast:{session_id}"
                if channel in subscribed_channels:
                    await pubsub.unsubscribe(channel)
                    subscribed_channels.discard(channel)
                    logger.debug("Screencast WS unsubscribed: session=%s", session_id)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("Screencast WebSocket error: %s", e)
    finally:
        if listener_task:
            listener_task.cancel()
            try:
                await listener_task
            except asyncio.CancelledError:
                pass
        if pubsub:
            try:
                if subscribed_channels:
                    await pubsub.unsubscribe(*subscribed_channels)
                await pubsub.close()
            except Exception:
                pass
        logger.debug(
            "Screencast WS closed (channels=%d)", len(subscribed_channels)
        )
