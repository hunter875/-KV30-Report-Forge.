"""initial

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('report_date', sa.Date(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_table(
        'report_rows',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('reports.id', ondelete='CASCADE'), nullable=False),
        sa.Column('row_type', postgresql.ENUM('statistics', 'cnch_event', 'other_task', 'vehicle', 'operation', name='row_type'), nullable=True),
        sa.Column('stt', sa.Integer(), nullable=True),
        sa.Column('noi_dung', sa.Text(), nullable=True),
        sa.Column('don_vi', sa.String(), nullable=True),
        sa.Column('ket_qua', sa.Integer(), nullable=True),
        sa.Column('ghi_chu', sa.Text(), nullable=True),
        sa.Column('mo_ta', sa.Text(), nullable=True),
        sa.Column('dia_diem', sa.Text(), nullable=True),
        sa.Column('thiet_hai', sa.Text(), nullable=True),
        sa.Column('thoi_gian', sa.Text(), nullable=True),
        sa.Column('ngay_xay_ra', sa.Text(), nullable=True),
        sa.Column('ket_qua_xu_ly', sa.Text(), nullable=True),
        sa.Column('noi_dung_tin_bao', sa.Text(), nullable=True),
        sa.Column('luc_luong_tham_gia', sa.Text(), nullable=True),
        sa.Column('thong_tin_nan_nhan', sa.Text(), nullable=True),
        sa.Column('bien_so', sa.String(), nullable=True),
        sa.Column('tinh_trang', sa.Text(), nullable=True),
        sa.Column('quan_so_truc', sa.Integer(), nullable=True),
        sa.Column('tong_bao_cao', sa.Integer(), nullable=True),
        sa.Column('chi_tiet_cnch', sa.Text(), nullable=True),
        sa.Column('tong_chi_vien', sa.Integer(), nullable=True),
        sa.Column('tong_cong_van', sa.Integer(), nullable=True),
        sa.Column('tong_ke_hoach', sa.Integer(), nullable=True),
        sa.Column('tong_so_vu_no', sa.Integer(), nullable=True),
        sa.Column('tong_so_vu_chay', sa.Integer(), nullable=True),
        sa.Column('tong_so_vu_cnch', sa.Integer(), nullable=True),
        sa.Column('tong_xe_hu_hong', sa.Integer(), nullable=True),
        sa.Column('cong_tac_an_ninh', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('ix_report_rows_report_id', 'report_rows', ['report_id'])

def downgrade() -> None:
    op.drop_index('ix_report_rows_report_id', table_name='report_rows')
    op.drop_table('report_rows')
    op.drop_table('reports')