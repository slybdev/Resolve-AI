"""add_ai_agent_name

Revision ID: 7a6a6f1ad83a
Revises: 32a4149b5d67
Create Date: 2026-04-04 03:37:48.996516+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a6a6f1ad83a'
down_revision: Union[str, None] = '32a4149b5d67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('workspaces', sa.Column('ai_agent_name', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('workspaces', 'ai_agent_name')
