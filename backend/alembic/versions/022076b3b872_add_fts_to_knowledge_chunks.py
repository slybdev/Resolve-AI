"""add_fts_to_knowledge_chunks

Revision ID: 022076b3b872
Revises: workspaces_ai_fields_v2
Create Date: 2026-03-31 15:44:18.285433+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '022076b3b872'
down_revision: Union[str, None] = 'workspaces_ai_fields_v2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create a functional GIN index for Full-Text Search
    op.execute(
        "CREATE INDEX idx_knowledge_chunks_content_fts ON knowledge_chunks USING GIN(to_tsvector('english', content))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX idx_knowledge_chunks_content_fts")
