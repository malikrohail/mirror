"""Add model column to personas and persona_templates.

Stores the AI model chosen for each persona (opus-4.6, sonnet-4.5, haiku-4.5).
Defaults to opus-4.6 for existing records.

Revision ID: 009
Revises: 008
"""

import sqlalchemy as sa
from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "personas",
        sa.Column("model", sa.String(50), nullable=True, server_default="opus-4.6"),
    )
    op.add_column(
        "persona_templates",
        sa.Column("model", sa.String(50), nullable=True, server_default="opus-4.6"),
    )


def downgrade() -> None:
    op.drop_column("persona_templates", "model")
    op.drop_column("personas", "model")
