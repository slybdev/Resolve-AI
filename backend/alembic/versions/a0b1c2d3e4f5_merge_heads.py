"""merge heads

Revision ID: a0b1c2d3e4f5
Revises: 022076b3b872, add_dedup_index_001
Create Date: 2026-04-01

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0b1c2d3e4f5'
down_revision: Union[str, Sequence[str], None] = ('022076b3b872', 'add_dedup_index_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
