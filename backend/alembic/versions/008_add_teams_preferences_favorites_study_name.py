"""Add user_teams, user_preferences, browser_favorites tables and study name column.

Revision ID: 008
Revises: 007

B1: No table changes (estimate is a stateless endpoint).
B2: user_teams — persists per-user persona team selections.
B3: user_preferences — persists per-user settings (browser_mode, theme, etc.).
B4: browser_favorites — persists bookmarked test URLs.
B5: studies.name — server-generated study name (e.g. "google-3").
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -- B5: Add name column to studies --
    op.add_column("studies", sa.Column("name", sa.String(255), nullable=True))

    # Backfill existing studies: parse URL to generate name like "domain-N"
    # Uses a window function to number rows per domain
    op.execute("""
        WITH numbered AS (
            SELECT
                id,
                COALESCE(
                    SPLIT_PART(
                        REPLACE(
                            REPLACE(
                                SPLIT_PART(
                                    SPLIT_PART(url, '://', 2),
                                    '/', 1
                                ),
                                'www.', ''
                            ),
                            '.', '-'
                        ),
                        '-', 1
                    ),
                    'study'
                ) AS domain_label,
                ROW_NUMBER() OVER (
                    PARTITION BY SPLIT_PART(
                        SPLIT_PART(url, '://', 2),
                        '/', 1
                    )
                    ORDER BY created_at
                ) AS domain_num
            FROM studies
            WHERE name IS NULL
        )
        UPDATE studies
        SET name = numbered.domain_label || '-' || numbered.domain_num
        FROM numbered
        WHERE studies.id = numbered.id
    """)

    # -- B2: user_teams table --
    op.create_table(
        "user_teams",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column(
            "persona_template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persona_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), server_default="0", nullable=False),
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
    op.create_index("ix_user_teams_user_id", "user_teams", ["user_id"])
    op.create_index(
        "ix_user_teams_user_persona",
        "user_teams",
        ["user_id", "persona_template_id"],
        unique=True,
    )

    # -- B3: user_preferences table --
    op.create_table(
        "user_preferences",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.String(255), nullable=False, unique=True),
        sa.Column("preferences", postgresql.JSONB, server_default="{}", nullable=False),
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
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"])

    # -- B4: browser_favorites table --
    op.create_table(
        "browser_favorites",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column("url", sa.String(2048), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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
    op.create_index("ix_browser_favorites_user_id", "browser_favorites", ["user_id"])


def downgrade() -> None:
    # Drop browser_favorites
    op.drop_index("ix_browser_favorites_user_id", table_name="browser_favorites")
    op.drop_table("browser_favorites")

    # Drop user_preferences
    op.drop_index("ix_user_preferences_user_id", table_name="user_preferences")
    op.drop_table("user_preferences")

    # Drop user_teams
    op.drop_index("ix_user_teams_user_persona", table_name="user_teams")
    op.drop_index("ix_user_teams_user_id", table_name="user_teams")
    op.drop_table("user_teams")

    # Drop study name column
    op.drop_column("studies", "name")
