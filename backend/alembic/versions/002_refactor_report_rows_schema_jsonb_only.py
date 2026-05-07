"""refactor_report_rows_schema_jsonb_only

Revision ID: 002
Revises: 001
Create Date: 2025-01-01 00:00:01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old columns (they are all nullable but we want clean schema)
    # Note: This loses data! For initial dev only. In production, would migrate data.
    with op.batch_alter_table('report_rows') as batch_op:
        batch_op.drop_column('noi_dung')
        batch_op.drop_column('don_vi')
        batch_op.drop_column('ket_qua')
        batch_op.drop_column('ghi_chu')
        batch_op.drop_column('mo_ta')
        batch_op.drop_column('dia_diem')
        batch_op.drop_column('thiet_hai')
        batch_op.drop_column('thoi_gian')
        batch_op.drop_column('ngay_xay_ra')
        batch_op.drop_column('ket_qua_xu_ly')
        batch_op.drop_column('noi_dung_tin_bao')
        batch_op.drop_column('luc_luong_tham_gia')
        batch_op.drop_column('thong_tin_nan_nhan')
        batch_op.drop_column('bien_so')
        batch_op.drop_column('tinh_trang')
        batch_op.drop_column('quan_so_truc')
        batch_op.drop_column('tong_bao_cao')
        batch_op.drop_column('chi_tiet_cnch')
        batch_op.drop_column('tong_chi_vien')
        batch_op.drop_column('tong_cong_van')
        batch_op.drop_column('tong_ke_hoach')
        batch_op.drop_column('tong_so_vu_no')
        batch_op.drop_column('tong_so_vu_chay')
        batch_op.drop_column('tong_so_vu_cnch')
        batch_op.drop_column('tong_xe_hu_hong')
        batch_op.drop_column('cong_tac_an_ninh')

    # Add payload JSONB column (not null with default)
    # For existing rows, we need to provide a default
    op.add_column('report_rows', sa.Column('payload', postgresql.JSONB, nullable=False, server_default='{}'))


def downgrade() -> None:
    # Re-add old columns (nullable)
    op.add_column('report_rows', sa.Column('noi_dung', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('don_vi', sa.String(), nullable=True))
    op.add_column('report_rows', sa.Column('ket_qua', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('ghi_chu', sa.Text(), nullable=True))

    op.add_column('report_rows', sa.Column('mo_ta', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('dia_diem', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('thiet_hai', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('thoi_gian', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('ngay_xay_ra', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('ket_qua_xu_ly', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('noi_dung_tin_bao', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('luc_luong_tham_gia', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('thong_tin_nan_nhan', sa.Text(), nullable=True))

    op.add_column('report_rows', sa.Column('bien_so', sa.String(), nullable=True))
    op.add_column('report_rows', sa.Column('tinh_trang', sa.Text(), nullable=True))

    op.add_column('report_rows', sa.Column('quan_so_truc', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_bao_cao', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('chi_tiet_cnch', sa.Text(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_chi_vien', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_cong_van', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_ke_hoach', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_so_vu_no', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_so_vu_chay', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_so_vu_cnch', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('tong_xe_hu_hong', sa.Integer(), nullable=True))
    op.add_column('report_rows', sa.Column('cong_tac_an_ninh', sa.String(), nullable=True))

    # Drop payload column
    op.drop_column('report_rows', 'payload')
