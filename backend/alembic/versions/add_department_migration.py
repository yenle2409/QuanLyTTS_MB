"""add department to intern_profiles

Revision ID: add_department_001
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('intern_profiles',
        sa.Column('department', sa.String(), nullable=True)
    )

def downgrade():
    op.drop_column('intern_profiles', 'department')