"""Add issue tracking, priority scoring, scroll depth, and performance fields.

Revision ID: 002
Revises: 001
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Issue tracking fields
    op.add_column("issues", sa.Column("first_seen_study_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("issues", sa.Column("times_seen", sa.Integer(), server_default="1", nullable=False))
    op.add_column("issues", sa.Column("is_regression", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("issues", sa.Column("priority_score", sa.Float(), nullable=True))

    # Scroll depth tracking on steps
    op.add_column("steps", sa.Column("scroll_y", sa.Integer(), nullable=True))
    op.add_column("steps", sa.Column("max_scroll_y", sa.Integer(), nullable=True))

    # Page load performance tracking on steps
    op.add_column("steps", sa.Column("load_time_ms", sa.Integer(), nullable=True))
    op.add_column("steps", sa.Column("first_paint_ms", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("steps", "first_paint_ms")
    op.drop_column("steps", "load_time_ms")
    op.drop_column("steps", "max_scroll_y")
    op.drop_column("steps", "scroll_y")
    op.drop_column("issues", "priority_score")
    op.drop_column("issues", "is_regression")
    op.drop_column("issues", "times_seen")
    op.drop_column("issues", "first_seen_study_id")
