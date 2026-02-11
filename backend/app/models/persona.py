import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Persona(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "personas"

    study_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("studies.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persona_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    profile: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    study: Mapped["Study"] = relationship("Study", back_populates="personas")  # noqa: F821
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="persona"
    )
    template: Mapped["PersonaTemplate | None"] = relationship("PersonaTemplate")


class PersonaTemplate(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "persona_templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    emoji: Mapped[str] = mapped_column(String(10), default="👤")
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    short_description: Mapped[str] = mapped_column(Text, nullable=False)
    default_profile: Mapped[dict] = mapped_column(JSONB, default=dict)
