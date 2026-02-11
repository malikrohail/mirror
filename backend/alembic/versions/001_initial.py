"""Initial migration — all core tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-02-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Enum types
study_status = postgresql.ENUM(
    "setup", "running", "analyzing", "complete", "failed",
    name="study_status", create_type=False,
)
session_status = postgresql.ENUM(
    "pending", "running", "complete", "failed", "gave_up",
    name="session_status", create_type=False,
)
issue_severity = postgresql.ENUM(
    "critical", "major", "minor", "enhancement",
    name="issue_severity", create_type=False,
)
insight_type = postgresql.ENUM(
    "universal", "persona_specific", "comparative", "recommendation",
    name="insight_type", create_type=False,
)


def upgrade() -> None:
    # Create enum types
    op.execute("CREATE TYPE study_status AS ENUM ('setup','running','analyzing','complete','failed')")
    op.execute("CREATE TYPE session_status AS ENUM ('pending','running','complete','failed','gave_up')")
    op.execute("CREATE TYPE issue_severity AS ENUM ('critical','major','minor','enhancement')")
    op.execute("CREATE TYPE insight_type AS ENUM ('universal','persona_specific','comparative','recommendation')")

    # persona_templates
    op.create_table(
        "persona_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("emoji", sa.String(10), server_default="👤"),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("short_description", sa.Text, nullable=False),
        sa.Column("default_profile", postgresql.JSONB, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # studies
    op.create_table(
        "studies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("starting_path", sa.String(2048), server_default="/"),
        sa.Column("status", study_status, nullable=False, server_default="setup"),
        sa.Column("overall_score", sa.Float, nullable=True),
        sa.Column("executive_summary", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # tasks
    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("study_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("studies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("order_index", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # personas
    op.create_table(
        "personas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("study_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("studies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("persona_templates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("profile", postgresql.JSONB, server_default="{}"),
        sa.Column("is_custom", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # sessions
    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("study_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("studies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("persona_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("personas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", session_status, nullable=False, server_default="pending"),
        sa.Column("total_steps", sa.Integer, server_default="0"),
        sa.Column("task_completed", sa.Boolean, server_default="false"),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("emotional_arc", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # steps
    op.create_table(
        "steps",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_number", sa.Integer, nullable=False),
        sa.Column("page_url", sa.String(2048), nullable=True),
        sa.Column("page_title", sa.String(1024), nullable=True),
        sa.Column("screenshot_path", sa.String(1024), nullable=True),
        sa.Column("think_aloud", sa.Text, nullable=True),
        sa.Column("action_type", sa.String(50), nullable=True),
        sa.Column("action_selector", sa.String(1024), nullable=True),
        sa.Column("action_value", sa.String(2048), nullable=True),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("task_progress", sa.Float, nullable=True),
        sa.Column("emotional_state", sa.String(50), nullable=True),
        sa.Column("click_x", sa.Integer, nullable=True),
        sa.Column("click_y", sa.Integer, nullable=True),
        sa.Column("viewport_width", sa.Integer, nullable=True),
        sa.Column("viewport_height", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # issues
    op.create_table(
        "issues",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("step_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("steps.id", ondelete="SET NULL"), nullable=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("study_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("studies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("element", sa.String(512), nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", issue_severity, nullable=False),
        sa.Column("heuristic", sa.String(255), nullable=True),
        sa.Column("wcag_criterion", sa.String(50), nullable=True),
        sa.Column("recommendation", sa.Text, nullable=True),
        sa.Column("page_url", sa.String(2048), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # insights
    op.create_table(
        "insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("study_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("studies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", insight_type, nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.String(50), nullable=True),
        sa.Column("impact", sa.String(50), nullable=True),
        sa.Column("effort", sa.String(50), nullable=True),
        sa.Column("personas_affected", postgresql.JSONB, nullable=True),
        sa.Column("evidence", postgresql.JSONB, nullable=True),
        sa.Column("rank", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Indexes
    op.create_index("ix_tasks_study_id", "tasks", ["study_id"])
    op.create_index("ix_personas_study_id", "personas", ["study_id"])
    op.create_index("ix_sessions_study_id", "sessions", ["study_id"])
    op.create_index("ix_sessions_persona_id", "sessions", ["persona_id"])
    op.create_index("ix_steps_session_id", "steps", ["session_id"])
    op.create_index("ix_issues_study_id", "issues", ["study_id"])
    op.create_index("ix_issues_session_id", "issues", ["session_id"])
    op.create_index("ix_issues_severity", "issues", ["severity"])
    op.create_index("ix_insights_study_id", "insights", ["study_id"])


def downgrade() -> None:
    op.drop_table("insights")
    op.drop_table("issues")
    op.drop_table("steps")
    op.drop_table("sessions")
    op.drop_table("personas")
    op.drop_table("tasks")
    op.drop_table("studies")
    op.drop_table("persona_templates")
    op.execute("DROP TYPE IF EXISTS insight_type")
    op.execute("DROP TYPE IF EXISTS issue_severity")
    op.execute("DROP TYPE IF EXISTS session_status")
    op.execute("DROP TYPE IF EXISTS study_status")
