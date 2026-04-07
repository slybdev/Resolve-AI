"""merge_heads_post_metadata

Revision ID: 32a4149b5d67
Revises: e4a5b6c7d8e9, e6a8b3a1dab1
Create Date: 2026-04-04 02:05:45.658107+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '32a4149b5d67'
down_revision: Union[str, None] = ('e4a5b6c7d8e9', 'e6a8b3a1dab1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
