"""add config to campaigns

Revision ID: b2c3d4e5f6a7
Revises: 
Create Date: 2026-05-07

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'ec615eddf062'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('campaigns', sa.Column('config', sa.JSON(), nullable=True, server_default='{}'))

def downgrade() -> None:
    op.drop_column('campaigns', 'config')
