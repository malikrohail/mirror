"""Add schedules table, session_videos table, and fix suggestion fields on issues.

Revision ID: 003
Revises: 002
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -- Schedules table (scheduled/continuous testing) --
    op.execute("CREATE TYPE schedule_status AS ENUM ('active', 'paused', 'deleted')")
    op.create_table(
        "schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("starting_path", sa.String(2048), server_default="/"),
        sa.Column(
            "tasks",
            postgresql.JSONB,
            nullable=False,
            comment='[{"description": "...", "order_index": 0}]',
        ),
        sa.Column(
            "persona_template_ids",
            postgresql.JSONB,
            nullable=False,
            comment="list of UUID strings",
        ),
        sa.Column(
            "cron_expression",
            sa.String(100),
            nullable=True,
            comment="Cron expression for scheduled runs",
        ),
        sa.Column(
            "webhook_secret",
            sa.String(255),
            nullable=True,
            comment="Secret for webhook-triggered runs",
        ),
        sa.Column(
            "status",
            postgresql.ENUM("active", "paused", "deleted", name="schedule_status", create_type=False),
            server_default="active",
            nullable=False,
        ),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_study_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("run_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    # Link studies back to a schedule
    op.add_column(
        "studies",
        sa.Column("schedule_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_studies_schedule_id",
        "studies",
        "schedules",
        ["schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # -- Session videos table --
    op.execute("CREATE TYPE video_status AS ENUM ('pending', 'generating', 'complete', 'failed')")
    op.create_table(
        "session_videos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sessions.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("video_path", sa.String(2048), nullable=True),
        sa.Column("duration_seconds", sa.Float(), nullable=True),
        sa.Column("frame_count", sa.Integer(), nullable=True),
        sa.Column("has_narration", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM("pending", "generating", "complete", "failed", name="video_status", create_type=False),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # -- AI fix suggestion fields on issues --
    op.add_column("issues", sa.Column("fix_suggestion", sa.Text(), nullable=True))
    op.add_column("issues", sa.Column("fix_code", sa.Text(), nullable=True))
    op.add_column("issues", sa.Column("fix_language", sa.String(50), nullable=True))


def downgrade() -> None:
    # Drop fix suggestion columns
    op.drop_column("issues", "fix_language")
    op.drop_column("issues", "fix_code")
    op.drop_column("issues", "fix_suggestion")

    # Drop session_videos table
    op.drop_table("session_videos")
    op.execute("DROP TYPE IF EXISTS video_status")

    # Drop schedule FK from studies
    op.drop_constraint("fk_studies_schedule_id", "studies", type_="foreignkey")
    op.drop_column("studies", "schedule_id")

    # Drop schedules table
    op.drop_table("schedules")
    op.execute("DROP TYPE IF EXISTS schedule_status")
