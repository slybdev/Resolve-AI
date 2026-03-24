"""add pgvector and new knowledge tables

Revision ID: c7d1e8a9b2c3
Revises: b6db217e8048
Create Date: 2026-03-24 08:40:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'c7d1e8a9b2c3'
down_revision: Union[str, None] = 'b6db217e8048'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Create knowledge_documents table
    op.create_table('knowledge_documents',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('source_id', sa.Uuid(), nullable=False),
        sa.Column('external_id', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('content_type', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['source_id'], ['knowledge_sources.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_documents_external_id'), 'knowledge_documents', ['external_id'], unique=False)
    op.create_index(op.f('ix_knowledge_documents_source_id'), 'knowledge_documents', ['source_id'], unique=False)

    # 3. Create knowledge_chunks table
    op.create_table('knowledge_chunks',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('document_id', sa.Uuid(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['knowledge_documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_chunks_document_id'), 'knowledge_chunks', ['document_id'], unique=False)

    # 4. Create knowledge_embeddings table
    op.create_table('knowledge_embeddings',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('chunk_id', sa.Uuid(), nullable=False),
        sa.Column('vector', Vector(dim=1536), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['chunk_id'], ['knowledge_chunks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_embeddings_chunk_id'), 'knowledge_embeddings', ['chunk_id'], unique=False)

    # 5. Create HNSW index for vector search (Postgres specific)
    # Using cosine distance (vector_cosine_ops)
    op.execute("CREATE INDEX ON knowledge_embeddings USING hnsw (vector vector_cosine_ops)")


def downgrade() -> None:
    op.drop_table('knowledge_embeddings')
    op.drop_table('knowledge_chunks')
    op.drop_table('knowledge_documents')
    # We generally don't drop the vector extension as other tables might use it, 
    # but for a complete rollback:
    # op.execute("DROP EXTENSION IF EXISTS vector")
