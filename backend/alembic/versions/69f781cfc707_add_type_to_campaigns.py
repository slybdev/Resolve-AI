"""add type to campaigns

Revision ID: 69f781cfc707
Revises: b2c3d4e5f6a7
Create Date: 2026-05-08 10:52:04.309863+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69f781cfc707'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'type' column to campaigns table using raw SQL for IF NOT EXISTS support
    op.execute(sa.text("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'news' NOT NULL"))


def downgrade() -> None:
    # Remove 'type' column from campaigns table
    op.drop_column('campaigns', 'type')
