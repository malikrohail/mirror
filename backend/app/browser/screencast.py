"""CDP screencast manager — streams JPEG frames from Chrome's compositor via CDP.

Attaches a CDP session to a Playwright page, calls Page.startScreencast,
handles Page.screencastFrame events, and publishes raw JPEG bytes to a
Redis binary PubSub channel for real-time browser streaming.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

import redis.asyncio as aioredis
from playwright.async_api import CDPSession, Page

from app.config import settings

logger = logging.getLogger(__name__)

# Module-level binary Redis pool (decode_responses=False).
# CRITICAL: The main app Redis uses decode_responses=True which corrupts
# binary data. This pool is exclusively for screencast JPEG frames.
_binary_redis: aioredis.Redis | None = None


async def get_binary_redis() -> aioredis.Redis:
    """Get or create a Redis connection pool with binary mode (no decoding).

    This MUST be separate from the main app Redis pool which uses
    decode_responses=True. Mixing text and binary on the same pool
    corrupts JPEG data.
    """
    global _binary_redis
    if _binary_redis is None:
        _binary_redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=False,
        )
    return _binary_redis


async def close_binary_redis() -> None:
    """Close the binary Redis pool. Call on app shutdown."""
    global _binary_redis
    if _binary_redis is not None:
        await _binary_redis.close()
        _binary_redis = None


class CDPScreencastManager:
    """Manages CDP screencast for a single Playwright page.

    Streams JPEG frames from Chrome's compositor to Redis PubSub,
    and optionally records frames to disk as a GIF/JPEG sequence.

    Usage::

        mgr = CDPScreencastManager(session_id="abc-123")
        await mgr.start(page)
        # ... navigation happens ...
        await mgr.stop()  # Also saves recording if enabled
    """

    def __init__(
        self,
        session_id: str,
        quality: int | None = None,
        max_width: int | None = None,
        max_height: int | None = None,
        every_nth_frame: int | None = None,
        record_to_disk: bool | None = None,
        recording_dir: str | None = None,
    ) -> None:
        self._session_id = session_id
        self._quality = quality or settings.SCREENCAST_QUALITY
        self._max_width = max_width or settings.SCREENCAST_MAX_WIDTH
        self._max_height = max_height or getattr(settings, "SCREENCAST_MAX_HEIGHT", 720)
        # Convert FPS to every_nth_frame: compositor runs at ~60fps,
        # so every_nth_frame = 60 / target_fps
        target_fps = settings.SCREENCAST_FPS
        self._every_nth_frame = every_nth_frame or max(1, 60 // target_fps)

        self._cdp: CDPSession | None = None
        self._redis: aioredis.Redis | None = None
        self._running = False
        self._channel = f"screencast:{session_id}"
        self._frame_count = 0

        # Recording to disk (Iteration 3)
        self._record_to_disk = record_to_disk if record_to_disk is not None else getattr(
            settings, "SCREENCAST_RECORD_TO_DISK", False
        )
        self._recording_dir = recording_dir
        self._recorded_frames: list[bytes] = []

    async def start(self, page: Page) -> None:
        """Attach CDP session and start screencast.

        Args:
            page: The Playwright page to screencast.
        """
        if self._running:
            logger.warning("Screencast already running for session %s", self._session_id)
            return

        try:
            self._redis = await get_binary_redis()
            self._cdp = await page.context.new_cdp_session(page)
            self._cdp.on("Page.screencastFrame", self._on_frame)

            await self._cdp.send(
                "Page.startScreencast",
                {
                    "format": "jpeg",
                    "quality": self._quality,
                    "maxWidth": self._max_width,
                    "maxHeight": self._max_height,
                    "everyNthFrame": self._every_nth_frame,
                },
            )
            self._running = True
            logger.info(
                "Screencast started: session=%s quality=%d max_width=%d every_nth=%d",
                self._session_id,
                self._quality,
                self._max_width,
                self._every_nth_frame,
            )
        except Exception as e:
            logger.warning("Failed to start screencast for session %s: %s", self._session_id, e)
            self._running = False

    async def _on_frame(self, params: dict[str, Any]) -> None:
        """Handle a CDP screencastFrame event.

        Decodes base64 JPEG, publishes to Redis, optionally stores for
        disk recording, and ACKs the frame so Chrome continues delivering.
        """
        if not self._running:
            return

        try:
            # ACK immediately so Chrome doesn't pause delivery.
            # The sessionId here is Chrome's internal integer frame ID.
            chrome_session_id = params.get("sessionId", 0)
            if self._cdp:
                await self._cdp.send(
                    "Page.screencastFrameAck",
                    {"sessionId": chrome_session_id},
                )

            # Decode base64 JPEG
            data_b64 = params.get("data", "")
            jpeg_bytes = base64.b64decode(data_b64)

            # Publish: 36-byte ASCII session_id prefix + raw JPEG
            session_prefix = self._session_id.encode("ascii")[:36].ljust(36, b"\x00")
            frame_payload = session_prefix + jpeg_bytes

            if self._redis:
                await self._redis.publish(self._channel, frame_payload)

            # Store frame for disk recording (sample every Nth frame to keep size reasonable)
            if self._record_to_disk and self._frame_count % 3 == 0:
                self._recorded_frames.append(jpeg_bytes)

            self._frame_count += 1
            if self._frame_count % 100 == 0:
                logger.debug(
                    "Screencast frame %d published: session=%s size=%dKB",
                    self._frame_count,
                    self._session_id,
                    len(jpeg_bytes) // 1024,
                )
        except Exception as e:
            # Non-fatal: log and continue
            logger.warning("Screencast frame error for session %s: %s", self._session_id, e)

    async def stop(self) -> None:
        """Stop the screencast, detach CDP session, and save recording if enabled."""
        if not self._running:
            return

        self._running = False

        if self._cdp:
            try:
                await self._cdp.send("Page.stopScreencast", {})
            except Exception as e:
                # Page may already be closed
                logger.debug("stopScreencast failed (page may be closed): %s", e)

            try:
                await self._cdp.detach()
            except Exception as e:
                logger.debug("CDP detach failed (page may be closed): %s", e)

            self._cdp = None

        # Save recording to disk if enabled (Iteration 3)
        if self._record_to_disk and self._recorded_frames:
            await self._save_recording()

        logger.info(
            "Screencast stopped: session=%s total_frames=%d recorded=%d",
            self._session_id,
            self._frame_count,
            len(self._recorded_frames),
        )

    async def _save_recording(self) -> None:
        """Save recorded frames as an animated GIF file.

        Uses Pillow to combine JPEG frames into an animated GIF.
        Falls back to saving individual JPEG frames if GIF creation fails.
        """
        import os

        storage_path = getattr(settings, "STORAGE_PATH", "./data")
        recording_dir = self._recording_dir or storage_path

        # Try to find the study/session path pattern
        output_dir = os.path.join(recording_dir, "recordings")
        os.makedirs(output_dir, exist_ok=True)

        try:
            from PIL import Image
            import io

            images = []
            for frame_bytes in self._recorded_frames:
                img = Image.open(io.BytesIO(frame_bytes))
                # Convert to RGB if needed (JPEG is RGB, GIF needs palette)
                if img.mode != "RGB":
                    img = img.convert("RGB")
                images.append(img)

            if images:
                gif_path = os.path.join(output_dir, f"{self._session_id}.gif")
                # Duration per frame: ~100ms (10fps sampled every 3rd frame)
                images[0].save(
                    gif_path,
                    save_all=True,
                    append_images=images[1:],
                    duration=100,
                    loop=0,
                    optimize=True,
                )
                logger.info(
                    "Saved screencast recording: %s (%d frames, %.1fMB)",
                    gif_path,
                    len(images),
                    os.path.getsize(gif_path) / (1024 * 1024),
                )
        except ImportError:
            logger.warning("Pillow not available, saving individual JPEG frames instead")
            frames_dir = os.path.join(output_dir, self._session_id)
            os.makedirs(frames_dir, exist_ok=True)
            for i, frame_bytes in enumerate(self._recorded_frames):
                frame_path = os.path.join(frames_dir, f"frame_{i:05d}.jpg")
                with open(frame_path, "wb") as f:
                    f.write(frame_bytes)
            logger.info(
                "Saved %d screencast frames to %s", len(self._recorded_frames), frames_dir
            )
        except Exception as e:
            logger.warning("Failed to save screencast recording: %s", e)

        # Free memory
        self._recorded_frames.clear()

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def frame_count(self) -> int:
        return self._frame_count
