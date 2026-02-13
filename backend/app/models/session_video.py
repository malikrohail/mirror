import enum
import uuid

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class VideoStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETE = "complete"
    FAILED = "failed"


class SessionVideo(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "session_videos"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    video_path: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    frame_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    has_narration: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[VideoStatus] = mapped_column(
        ENUM(VideoStatus, name="video_status", create_type=False, values_callable=lambda e: [x.value for x in e]),
        default=VideoStatus.PENDING,
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="video")  # noqa: F821
