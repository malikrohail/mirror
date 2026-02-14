"""Add cost tracking columns to studies table.

Revision ID: 004
Revises: 003
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("studies", sa.Column("llm_input_tokens", sa.Integer(), nullable=True))
    op.add_column("studies", sa.Column("llm_output_tokens", sa.Integer(), nullable=True))
    op.add_column("studies", sa.Column("llm_total_tokens", sa.Integer(), nullable=True))
    op.add_column("studies", sa.Column("llm_api_calls", sa.Integer(), nullable=True))
    op.add_column("studies", sa.Column("llm_cost_usd", sa.Float(), nullable=True))
    op.add_column("studies", sa.Column("browser_mode", sa.String(20), nullable=True))
    op.add_column("studies", sa.Column("browser_cost_usd", sa.Float(), nullable=True))
    op.add_column("studies", sa.Column("total_cost_usd", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("studies", "total_cost_usd")
    op.drop_column("studies", "browser_cost_usd")
    op.drop_column("studies", "browser_mode")
    op.drop_column("studies", "llm_cost_usd")
    op.drop_column("studies", "llm_api_calls")
    op.drop_column("studies", "llm_total_tokens")
    op.drop_column("studies", "llm_output_tokens")
    op.drop_column("studies", "llm_input_tokens")
