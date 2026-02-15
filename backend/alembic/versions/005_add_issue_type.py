"""Add issue_type column to issues table.

Revision ID: 005
Revises: 004
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add nullable column first
    op.add_column(
        "issues",
        sa.Column("issue_type", sa.String(50), nullable=True, server_default="ux"),
    )

    # Backfill: classify accessibility issues
    op.execute("""
        UPDATE issues SET issue_type = 'accessibility'
        WHERE wcag_criterion IS NOT NULL
           OR heuristic ILIKE '%accessibility%'
    """)

    # Backfill: classify error issues
    op.execute("""
        UPDATE issues SET issue_type = 'error'
        WHERE issue_type IS NULL
          AND (
            heuristic ILIKE '%error%'
            OR heuristic ILIKE '%recovery%'
            OR description ILIKE '%broken%'
            OR description ILIKE '%404%'
            OR description ILIKE '%failed%'
            OR description ILIKE '%unresponsive%'
          )
    """)

    # Backfill: classify performance issues
    op.execute("""
        UPDATE issues SET issue_type = 'performance'
        WHERE issue_type IS NULL
          AND (
            description ILIKE '%slow%'
            OR description ILIKE '%loading%'
            OR description ILIKE '%timeout%'
            OR description ILIKE '%lag%'
          )
    """)

    # Everything else defaults to 'ux'
    op.execute("UPDATE issues SET issue_type = 'ux' WHERE issue_type IS NULL")

    # Now make it non-nullable
    op.alter_column("issues", "issue_type", nullable=False, server_default="ux")


def downgrade() -> None:
    op.drop_column("issues", "issue_type")
