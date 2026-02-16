"""Browser favorites model — persists bookmarked test URLs server-side."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class BrowserFavorite(Base, UUIDMixin, TimestampMixin):
    """A bookmarked URL that a user wants to test repeatedly."""

    __tablename__ = "browser_favorites"

    user_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True,
    )
    url: Mapped[str] = mapped_column(
        String(2048), nullable=False,
    )
    label: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True,
    )
