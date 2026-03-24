"""add allowed_pages to workspace_members and invites

Revision ID: a1b2c3d4e5f6
Revises: 2f9d604a2a29
Create Date: 2026-03-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '2f9d604a2a29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('workspace_members', sa.Column('allowed_pages', sa.JSON(), nullable=True))
    op.add_column('invites', sa.Column('allowed_pages', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('invites', 'allowed_pages')
    op.drop_column('workspace_members', 'allowed_pages')
