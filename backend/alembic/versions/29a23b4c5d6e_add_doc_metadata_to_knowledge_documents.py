"""add doc_metadata to knowledge_documents

Revision ID: 29a23b4c5d6e
Revises: 18a1100c1f62
Create Date: 2026-03-30 00:20:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '29a23b4c5d6e'
down_revision: Union[str, None] = '18a1100c1f62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add doc_metadata column to knowledge_documents
    op.add_column('knowledge_documents', 
        sa.Column('doc_metadata', postgresql.JSON(astext_type=sa.Text()), server_default='{}', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('knowledge_documents', 'doc_metadata')
