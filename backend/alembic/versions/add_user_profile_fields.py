"""add user profile fields

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-06-21

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('bio', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('department', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'department')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'phone')
