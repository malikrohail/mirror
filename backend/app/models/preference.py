"""User preferences model — persists user settings server-side."""

from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class UserPreference(Base, UUIDMixin, TimestampMixin):
    """Stores per-user preferences as a JSONB blob."""

    __tablename__ = "user_preferences"

    user_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True,
    )
    preferences: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}",
    )
