"""add_created_by_and_category_to_campaigns

Revision ID: 41494a453c9f
Revises: 69f781cfc707
Create Date: 2026-05-14 08:56:30.562888+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '41494a453c9f'
down_revision: Union[str, None] = '69f781cfc707'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('campaigns', sa.Column('category', sa.String(length=100), nullable=True))
    op.add_column('campaigns', sa.Column('created_by', sa.Uuid(), nullable=True))
    op.create_foreign_key('fk_campaigns_created_by_users', 'campaigns', 'users', ['created_by'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_campaigns_created_by_users', 'campaigns', type_='foreignkey')
    op.drop_column('campaigns', 'created_by')
    op.drop_column('campaigns', 'category')
