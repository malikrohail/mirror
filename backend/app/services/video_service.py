"""Video replay generation — stitch session screenshots into animated GIF with narration overlay."""

from __future__ import annotations

import io
import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.session import Session
from app.models.session_video import SessionVideo, VideoStatus
from app.models.step import Step
from app.storage.file_storage import FileStorage

logger = logging.getLogger(__name__)

FRAME_DURATION_MS = 2000


class VideoService:
    """Generates animated replay videos from session screenshots."""

    def __init__(self, db: AsyncSession, storage: FileStorage | None = None) -> None:
        self.db = db
        self.storage = storage

    async def get_video(self, session_id: uuid.UUID) -> SessionVideo | None:
        result = await self.db.execute(select(SessionVideo).where(SessionVideo.session_id == session_id))
        return result.scalar_one_or_none()

    async def generate_video(self, session_id: uuid.UUID, frame_duration_ms: int = FRAME_DURATION_MS, include_narration: bool = True) -> SessionVideo:
        """Generate an animated GIF replay from session screenshots."""
        result = await self.db.execute(
            select(Session).options(selectinload(Session.steps)).where(Session.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        existing = await self.get_video(session_id)
        video = existing or SessionVideo(id=uuid.uuid4(), session_id=session_id, status=VideoStatus.GENERATING)
        if not existing:
            self.db.add(video)
        else:
            video.status = VideoStatus.GENERATING
        await self.db.flush()

        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            video.status = VideoStatus.FAILED
            video.error_message = "Pillow not installed"
            await self.db.commit()
            return video

        try:
            steps = sorted(session.steps, key=lambda s: s.step_number)
            if not steps:
                video.status = VideoStatus.FAILED
                video.error_message = "No steps found"
                await self.db.commit()
                return video

            frames: list[Image.Image] = []
            for step in steps:
                if not step.screenshot_path or not self.storage:
                    continue
                try:
                    img_bytes = await self.storage.read(step.screenshot_path)
                    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
                except Exception as e:
                    logger.warning("Failed to load screenshot %s: %s", step.screenshot_path, e)
                    continue

                if include_narration and step.think_aloud:
                    img = self._add_narration_overlay(img, step, ImageDraw, ImageFont)
                frames.append(img.convert("RGB"))

            if not frames:
                video.status = VideoStatus.FAILED
                video.error_message = "No valid screenshots found"
                await self.db.commit()
                return video

            gif_buffer = io.BytesIO()
            frames[0].save(gif_buffer, format="GIF", save_all=True, append_images=frames[1:], duration=frame_duration_ms, loop=0, optimize=False)
            gif_bytes = gif_buffer.getvalue()

            video_path = f"{session.study_id}/{session_id}/replay.gif"
            await self.storage.write(video_path, gif_bytes)

            video.video_path = video_path
            video.status = VideoStatus.COMPLETE
            video.frame_count = len(frames)
            video.duration_seconds = (len(frames) * frame_duration_ms) / 1000.0
            video.has_narration = include_narration
            video.error_message = None
            await self.db.commit()
            return video

        except Exception as e:
            logger.error("Video generation failed for session %s: %s", session_id, e)
            video.status = VideoStatus.FAILED
            video.error_message = str(e)[:500]
            await self.db.commit()
            return video

    def _add_narration_overlay(self, img, step: Step, ImageDraw, ImageFont):
        """Add a think-aloud narration bubble at the bottom."""
        from PIL import Image

        width, height = img.size
        bar_height = min(120, height // 5)

        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        draw.rectangle([(0, height - bar_height), (width, height)], fill=(0, 0, 0, 180))

        header = f"Step {step.step_number}"
        if step.emotional_state:
            header += f"  [{step.emotional_state}]"
        if step.action_type:
            header += f"  |  {step.action_type}"

        try:
            font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
            font_main = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
        except (OSError, IOError):
            font_sm = ImageFont.load_default()
            font_main = font_sm

        draw.text((16, height - bar_height + 8), header, fill=(180, 180, 180, 255), font=font_sm)

        text = step.think_aloud or ""
        max_chars = (width - 32) // 9
        if len(text) > max_chars * 3:
            text = text[:max_chars * 3 - 3] + "..."
        lines, current = [], ""
        for word in text.split():
            test = f"{current} {word}".strip()
            if len(test) <= max_chars:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)

        y = height - bar_height + 30
        for line in lines[:3]:
            draw.text((16, y), f'"{line}"', fill=(255, 255, 255, 230), font=font_main)
            y += 22

        return Image.alpha_composite(img, overlay)

    async def list_videos(self, study_id: uuid.UUID) -> list[SessionVideo]:
        result = await self.db.execute(
            select(SessionVideo).join(Session, Session.id == SessionVideo.session_id).where(Session.study_id == study_id)
        )
        return list(result.scalars().all())
