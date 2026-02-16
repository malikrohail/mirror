"""Team model — persists a user's selected persona team server-side."""

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class UserTeam(Base, UUIDMixin, TimestampMixin):
    """Tracks which persona templates a user has added to their team."""

    __tablename__ = "user_teams"

    user_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True,
    )
    persona_template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persona_templates.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
    )

    # Relationship to PersonaTemplate
    persona_template: Mapped["PersonaTemplate"] = relationship(  # noqa: F821
        "PersonaTemplate", lazy="selectin",
    )
