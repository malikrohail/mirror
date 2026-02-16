"""Add ux_score column to sessions.

Stores per-persona UX score assigned during synthesis.

Revision ID: 010
Revises: 009
"""

import sqlalchemy as sa
from alembic import op

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("ux_score", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("sessions", "ux_score")
