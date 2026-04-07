"""merge existing heads

Revision ID: head_merge_2024
Revises: 29a23b4c5d6e, a1b2c3d4e5f6
Create Date: 2026-03-31 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'head_merge_2024'
down_revision: Union[str, Sequence[str], None] = ('29a23b4c5d6e', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
