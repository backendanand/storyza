"""add project publish fields

Revision ID: 20260907_add_project_publish
Revises: c1e2f3a4b5c6
Create Date: 2026-09-07 09:00:00.000000+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '20260907_add_project_publish'
down_revision: Union[str, None] = 'c1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('projects', sa.Column('category', sa.String(length=64), nullable=True))
    op.add_column('projects', sa.Column('theme', sa.String(length=64), nullable=True))
    op.add_column('projects', sa.Column('description', sa.Text(), nullable=True))
    op.create_index('ix_projects_category', 'projects', ['category'])
    op.create_index('ix_projects_theme', 'projects', ['theme'])
    op.create_index('ix_projects_status', 'projects', ['status'])


def downgrade() -> None:
    op.drop_index('ix_projects_status', table_name='projects')
    op.drop_index('ix_projects_theme', table_name='projects')
    op.drop_index('ix_projects_category', table_name='projects')
    op.drop_column('projects', 'description')
    op.drop_column('projects', 'theme')
    op.drop_column('projects', 'category')