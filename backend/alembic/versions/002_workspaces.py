"""002 — Create workspaces, workspace_members, and invites tables.

Revision ID: 002
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("plan", sa.String(50), default="free", nullable=False),
        sa.Column("owner_id", sa.Uuid, sa.ForeignKey("users.id"), nullable=False),
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

    op.create_table(
        "workspace_members",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "workspace_id", sa.Uuid, sa.ForeignKey("workspaces.id"), nullable=False
        ),
        sa.Column("role", sa.String(50), default="member", nullable=False),
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

    op.create_table(
        "invites",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, index=True),
        sa.Column(
            "workspace_id", sa.Uuid, sa.ForeignKey("workspaces.id"), nullable=False
        ),
        sa.Column(
            "invited_by", sa.Uuid, sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "token", sa.String(255), unique=True, index=True, nullable=False
        ),
        sa.Column("role", sa.String(50), default="member", nullable=False),
        sa.Column("status", sa.String(50), default="pending", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
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


def downgrade() -> None:
    op.drop_table("invites")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
