"""
Alembic migration: Add production knowledge system tables.

Changes:
  - Add status, type, workspace_id columns to knowledge_documents
  - Make source_id nullable on knowledge_documents
  - Add sync_status to knowledge_sources
  - Create folders table
  - Create document_folders association table
  - Drop knowledge_items table
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = 'd8e2f3a4b5c6'
down_revision = 'c7d1e8a9b2c3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── knowledge_documents: add new columns ──
    op.add_column('knowledge_documents',
        sa.Column('workspace_id', UUID(), nullable=True)
    )
    op.add_column('knowledge_documents',
        sa.Column('status', sa.String(50), server_default='pending', nullable=False)
    )
    op.add_column('knowledge_documents',
        sa.Column('type', sa.String(50), server_default='unknown', nullable=False)
    )

    # Make source_id nullable
    op.alter_column('knowledge_documents', 'source_id', nullable=True)

    # Add FK and index for workspace_id
    op.create_foreign_key(
        'fk_knowledge_documents_workspace_id',
        'knowledge_documents', 'workspaces',
        ['workspace_id'], ['id']
    )
    op.create_index('ix_knowledge_documents_workspace_id', 'knowledge_documents', ['workspace_id'])
    op.create_index('ix_knowledge_documents_status', 'knowledge_documents', ['status'])

    # Backfill workspace_id from source
    op.execute("""
        UPDATE knowledge_documents d
        SET workspace_id = s.workspace_id
        FROM knowledge_sources s
        WHERE d.source_id = s.id
        AND d.workspace_id IS NULL
    """)

    # ── knowledge_sources: add sync_status ──
    op.add_column('knowledge_sources',
        sa.Column('sync_status', sa.String(50), server_default='idle', nullable=False)
    )

    # ── Create folders table ──
    op.create_table(
        'folders',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('workspace_id', UUID(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('parent_id', UUID(), sa.ForeignKey('folders.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_folders_workspace_id', 'folders', ['workspace_id'])

    # ── Create document_folders association table ──
    op.create_table(
        'document_folders',
        sa.Column('document_id', UUID(), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('folder_id', UUID(), sa.ForeignKey('folders.id', ondelete='CASCADE'), primary_key=True),
    )

    # ── Drop legacy knowledge_items table ──
    op.drop_table('knowledge_items')


def downgrade() -> None:
    # Recreate knowledge_items (simplified — no data restoration)
    op.create_table(
        'knowledge_items',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('workspace_id', UUID(), sa.ForeignKey('workspaces.id'), nullable=False),
        sa.Column('source_id', UUID(), sa.ForeignKey('knowledge_sources.id'), nullable=True),
        sa.Column('parent_id', UUID(), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('content_url', sa.Text(), nullable=True),
        sa.Column('content_text', sa.Text(), nullable=True),
        sa.Column('additional_metadata', sa.JSON(), nullable=True),
        sa.Column('usage_agent', sa.Boolean(), server_default='true'),
        sa.Column('usage_copilot', sa.Boolean(), server_default='true'),
        sa.Column('usage_help_center', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.drop_table('document_folders')
    op.drop_table('folders')

    op.drop_column('knowledge_sources', 'sync_status')

    op.drop_index('ix_knowledge_documents_status', 'knowledge_documents')
    op.drop_index('ix_knowledge_documents_workspace_id', 'knowledge_documents')
    op.drop_constraint('fk_knowledge_documents_workspace_id', 'knowledge_documents')
    op.alter_column('knowledge_documents', 'source_id', nullable=False)
    op.drop_column('knowledge_documents', 'type')
    op.drop_column('knowledge_documents', 'status')
    op.drop_column('knowledge_documents', 'workspace_id')
