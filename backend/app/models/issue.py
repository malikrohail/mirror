import enum
import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class IssueSeverity(str, enum.Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"
    ENHANCEMENT = "enhancement"


class Issue(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "issues"

    step_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("steps.id", ondelete="SET NULL"), nullable=True
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    study_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("studies.id", ondelete="CASCADE"), nullable=False
    )
    element: Mapped[str | None] = mapped_column(String(512), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[IssueSeverity] = mapped_column(
        ENUM(IssueSeverity, name="issue_severity", create_type=True),
        nullable=False,
    )
    heuristic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    wcag_criterion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    # Issue tracking (cross-study deduplication)
    first_seen_study_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    times_seen: Mapped[int] = mapped_column(Integer, default=1)
    is_regression: Mapped[bool] = mapped_column(Boolean, default=False)

    # Priority scoring (severity calibration)
    priority_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    step: Mapped["Step | None"] = relationship("Step", back_populates="issues")  # noqa: F821
    session: Mapped["Session"] = relationship("Session", back_populates="issues")  # noqa: F821
    study: Mapped["Study"] = relationship("Study", back_populates="issues")  # noqa: F821
