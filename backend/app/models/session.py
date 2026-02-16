import enum
import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class SessionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"
    GAVE_UP = "gave_up"


class Session(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sessions"

    study_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("studies.id", ondelete="CASCADE"), nullable=False
    )
    persona_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("personas.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[SessionStatus] = mapped_column(
        ENUM(SessionStatus, name="session_status", create_type=False, values_callable=lambda e: [x.value for x in e]),
        default=SessionStatus.PENDING,
        nullable=False,
    )
    total_steps: Mapped[int] = mapped_column(Integer, default=0)
    task_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotional_arc: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ux_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    study: Mapped["Study"] = relationship("Study", back_populates="sessions")  # noqa: F821
    persona: Mapped["Persona"] = relationship("Persona", back_populates="sessions")  # noqa: F821
    task: Mapped["Task"] = relationship("Task", back_populates="sessions")  # noqa: F821
    steps: Mapped[list["Step"]] = relationship(  # noqa: F821
        "Step", back_populates="session", cascade="all, delete-orphan",
        order_by="Step.step_number",
    )
    issues: Mapped[list["Issue"]] = relationship(  # noqa: F821
        "Issue", back_populates="session", cascade="all, delete-orphan"
    )
    video: Mapped["SessionVideo | None"] = relationship(  # noqa: F821
        "SessionVideo", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )
