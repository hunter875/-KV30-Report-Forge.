"""add_frontend_row_types

Revision ID: 003
Revises: 002
Create Date: 2026-05-06 00:00:00

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE row_type ADD VALUE IF NOT EXISTS 'sclq'")
    op.execute("ALTER TYPE row_type ADD VALUE IF NOT EXISTS 'tong_vu_chay'")


def downgrade() -> None:
    # PostgreSQL cannot drop enum values directly without recreating the type.
    pass
