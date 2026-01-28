"""add project stage column

Revision ID: 002_add_project_stage
Revises: 001_initial
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa

revision = "002_add_project_stage"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("projects", sa.Column("stage", sa.String(), nullable=True))
    op.add_column("ideas", sa.Column("meta", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("projects", "stage")
    op.drop_column("ideas", "meta")
