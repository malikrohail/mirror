"""Add started_at and duration_seconds columns to studies.

Tracks when a study actually started running (not when it was created)
and persists the final duration so it survives page reloads.

Revision ID: 007
Revises: 006
"""

import sqlalchemy as sa
from alembic import op

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("studies", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("studies", sa.Column("duration_seconds", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("studies", "duration_seconds")
    op.drop_column("studies", "started_at")
