"""Widen issue heuristic and wcag_criterion columns.

The LLM generates heuristic strings like "4. System and user alignment;
2. User control and freedom" which exceed VARCHAR(50). This caused
StringDataRightTruncationError which poisoned the DB session and lost
all step data for the affected persona.

Revision ID: 006
Revises: 005
"""

import sqlalchemy as sa
from alembic import op

revision = "006"
down_revision = "005"


def upgrade() -> None:
    op.alter_column("issues", "heuristic", type_=sa.String(500), existing_nullable=True)
    op.alter_column("issues", "wcag_criterion", type_=sa.String(255), existing_nullable=True)


def downgrade() -> None:
    op.alter_column("issues", "heuristic", type_=sa.String(50), existing_nullable=True)
    op.alter_column("issues", "wcag_criterion", type_=sa.String(50), existing_nullable=True)
