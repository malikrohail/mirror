import enum

from sqlalchemy import Float, String, Text
from sqlalchemy.dialects.postgresql import ENUM
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
    status: Mapped[StudyStatus] = mapped_column(
        ENUM(StudyStatus, name="study_status", create_type=True),
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
