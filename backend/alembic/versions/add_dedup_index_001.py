"""add dedup unique index on messages

Revision ID: add_dedup_index_001
Revises: 
Create Date: 2026-03-31

Adds a unique constraint on (channel_id, external_id) to prevent 
duplicate messages from external channels (Telegram, Discord, etc).
"""

from alembic import op


revision = 'add_dedup_index_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a partial unique constraint — only enforced when both columns are non-null.
    # Messages without a channel or external_id (e.g., agent-sent, system) are unaffected.
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_external_id 
        ON messages (channel_id, external_id) 
        WHERE channel_id IS NOT NULL AND external_id IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_channel_external_id")
