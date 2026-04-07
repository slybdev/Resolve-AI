"""add_assignment_status_to_tickets

Revision ID: 5e6f7a8b9c0d
Revises: 9a8ce3ce2fdf
Create Date: 2026-04-03 19:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e6f7a8b9c0d'
down_revision: Union[str, None] = '9a8ce3ce2fdf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('assignment_status', sa.String(length=50), nullable=False, server_default='none'))


def downgrade() -> None:
    op.drop_column('tickets', 'assignment_status')
