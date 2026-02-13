import enum
import uuid

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ScheduleStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    DELETED = "deleted"


class Schedule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "schedules"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    starting_path: Mapped[str] = mapped_column(String(2048), default="/")
    tasks: Mapped[list] = mapped_column(JSONB, nullable=False)
    persona_template_ids: Mapped[list] = mapped_column(JSONB, nullable=False)

    cron_expression: Mapped[str | None] = mapped_column(String(100), nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[ScheduleStatus] = mapped_column(
        ENUM(ScheduleStatus, name="schedule_status", create_type=False, values_callable=lambda e: [x.value for x in e]),
        default=ScheduleStatus.ACTIVE,
        nullable=False,
    )
    last_run_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_study_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    run_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationship: studies created by this schedule
    studies: Mapped[list["Study"]] = relationship(  # noqa: F821
        "Study", back_populates="schedule", foreign_keys="Study.schedule_id"
    )
