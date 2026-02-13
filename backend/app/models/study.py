import enum
import uuid

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class StudyStatus(str, enum.Enum):
    SETUP = "setup"
    RUNNING = "running"
    ANALYZING = "analyzing"
    COMPLETE = "complete"
    FAILED = "failed"


class Study(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "studies"

    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    starting_path: Mapped[str] = mapped_column(String(2048), default="/")
    schedule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[StudyStatus] = mapped_column(
        ENUM(StudyStatus, name="study_status", create_type=False, values_callable=lambda e: [x.value for x in e]),
        default=StudyStatus.SETUP,
        nullable=False,
    )
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    executive_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task", back_populates="study", cascade="all, delete-orphan"
    )
    personas: Mapped[list["Persona"]] = relationship(  # noqa: F821
        "Persona", back_populates="study", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="study", cascade="all, delete-orphan"
    )
    issues: Mapped[list["Issue"]] = relationship(  # noqa: F821
        "Issue", back_populates="study", cascade="all, delete-orphan"
    )
    insights: Mapped[list["Insight"]] = relationship(  # noqa: F821
        "Insight", back_populates="study", cascade="all, delete-orphan"
    )
    schedule: Mapped["Schedule | None"] = relationship(  # noqa: F821
        "Schedule", back_populates="studies", foreign_keys=[schedule_id]
    )
