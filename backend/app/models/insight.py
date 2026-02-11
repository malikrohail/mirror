import enum
import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class InsightType(str, enum.Enum):
    UNIVERSAL = "universal"
    PERSONA_SPECIFIC = "persona_specific"
    COMPARATIVE = "comparative"
    RECOMMENDATION = "recommendation"


class Insight(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "insights"

    study_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("studies.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[InsightType] = mapped_column(
        ENUM(InsightType, name="insight_type", create_type=True),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    impact: Mapped[str | None] = mapped_column(String(50), nullable=True)
    effort: Mapped[str | None] = mapped_column(String(50), nullable=True)
    personas_affected: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    evidence: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    study: Mapped["Study"] = relationship("Study", back_populates="insights")  # noqa: F821
