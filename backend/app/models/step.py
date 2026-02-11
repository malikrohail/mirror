import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Step(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "steps"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    page_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    page_title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    screenshot_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    think_aloud: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    action_selector: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    action_value: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    task_progress: Mapped[float | None] = mapped_column(Float, nullable=True)
    emotional_state: Mapped[str | None] = mapped_column(String(50), nullable=True)
    click_x: Mapped[int | None] = mapped_column(Integer, nullable=True)
    click_y: Mapped[int | None] = mapped_column(Integer, nullable=True)
    viewport_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    viewport_height: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Scroll depth tracking
    scroll_y: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_scroll_y: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Page load performance tracking
    load_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_paint_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="steps")  # noqa: F821
    issues: Mapped[list["Issue"]] = relationship(  # noqa: F821
        "Issue", back_populates="step"
    )
