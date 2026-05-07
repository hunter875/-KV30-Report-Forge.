import { GridColumn, DomainRowType } from '@/types/report'

export const COLUMNS_BY_TAB: Record<DomainRowType, GridColumn[]> = {
  statistics: [
    { key: 'stt', title: 'STT', type: 'text', width: 70, readonly: true },
    { key: 'noi_dung', title: 'Nội dung', type: 'text', width: 520, readonly: true },
    { key: 'ket_qua', title: 'Kết quả', type: 'number', width: 120 }
  ],

  cnch_event: [
    { key: 'stt', title: 'STT', type: 'number', width: 60, readonly: true },
    { key: 'loai_hinh_cnch', title: 'Loại hình CNCH', type: 'text', width: 170 },
    { key: 'ngay_xay_ra', title: 'Ngày xảy ra sự cố', type: 'date', width: 130 },
    { key: 'thoi_gian', title: 'Thời gian đến', type: 'text', width: 140 },
    { key: 'dia_diem', title: 'Địa điểm', type: 'text', width: 240 },
    { key: 'dia_chi', title: 'Địa chỉ', type: 'text', width: 360 },
    { key: 'chi_huy_cnch', title: 'Chỉ huy CNCH', type: 'text', width: 170 },
    { key: 'thiet_hai_ve_nguoi', title: 'Thiệt hại về người', type: 'text', width: 140 },
    { key: 'so_nguoi_cuu_duoc', title: 'Số người cứu được', type: 'number', width: 140 }
  ],

  sclq: [
    { key: 'stt', title: 'STT', type: 'number', width: 60, readonly: true },
    { key: 'vu_chay_ngay', title: 'VỤ CHÁY NGÀY', type: 'date', width: 130 },
    { key: 'dia_diem', title: 'ĐỊA ĐIỂM', type: 'text', width: 360 },
    { key: 'nguyen_nhan', title: 'NGUYÊN NHÂN', type: 'text', width: 260 },
    { key: 'thiet_hai', title: 'THIỆT HẠI', type: 'text', width: 220 },
    { key: 'chi_huy_chua_chay', title: 'CHỈ HUY CHỮA CHÁY', type: 'text', width: 180 },
    { key: 'ghi_chu', title: 'GHI CHÚ', type: 'text', width: 180 }
  ],

  tong_vu_chay: [
    { key: 'stt', title: 'STT', type: 'number', width: 60, readonly: true },
    { key: 'ngay_xay_ra', title: 'NGÀY XẢY RA VỤ CHÁY', type: 'date', width: 120 },
    { key: 'vu_chay', title: 'VỤ CHÁY', type: 'text', width: 240 },
    { key: 'thoi_gian', title: 'THỜI GIAN', type: 'text', width: 140 },
    { key: 'dia_diem', title: 'ĐỊA ĐIỂM', type: 'text', width: 300 },
    { key: 'phan_loai', title: 'PHÂN LOẠI', type: 'text', width: 130 },
    { key: 'nguyen_nhan', title: 'NGUYÊN NHÂN', type: 'text', width: 190 },
    { key: 'thiet_hai_ve_nguoi', title: 'THIỆT HẠI VỀ NGƯỜI', type: 'text', width: 140 },
    { key: 'thiet_hai_tai_san', title: 'THIỆT HẠI TÀI SẢN', type: 'text', width: 160 },
    { key: 'tai_san_cuu_chua', title: 'TÀI SẢN CỨU CHỮA', type: 'text', width: 180 },
    { key: 'thoi_gian_toi_dam_chay', title: 'THỜI GIAN TỚI ĐÁM CHÁY', type: 'text', width: 170 },
    { key: 'thoi_gian_khong_che', title: 'THỜI GIAN KHỐNG CHẾ', type: 'text', width: 160 },
    { key: 'thoi_gian_dap_tat_hoan_toan', title: 'THỜI GIAN DẬP TẮT HOÀN TOÀN', type: 'text', width: 180 },
    { key: 'so_luong_xe', title: 'SỐ LƯỢNG XE', type: 'number', width: 120 },
    { key: 'chi_huy_chua_chay', title: 'CHỈ HUY CHỮA CHÁY', type: 'text', width: 180 },
    { key: 'ghi_chu', title: 'GHI CHÚ', type: 'text', width: 160 }
  ],

  operation: [
    { key: 'so_bao_cao', title: 'Số báo cáo', type: 'text', width: 220 },
    { key: 'don_vi_bao_cao', title: 'Đơn vị báo cáo', type: 'text', width: 320 },
    { key: 'thoi_gian_tu_den', title: 'Thời gian từ đến', type: 'text', width: 520 },
    { key: 'quan_so_truc', title: 'Quân số trực', type: 'number' },
    { key: 'tong_bao_cao', title: 'Tổng báo cáo', type: 'number' },
    { key: 'chi_tiet_cnch', title: 'Chi tiết CNCH / SCLQ', type: 'text' },
    { key: 'tong_chi_vien', title: 'Tổng chi viện', type: 'number' },
    { key: 'tong_cong_van', title: 'Tổng công văn', type: 'number' },
    { key: 'tong_ke_hoach', title: 'Tổng kế hoạch', type: 'number' },
    { key: 'tong_so_vu_no', title: 'Tổng số vụ nổ', type: 'number' },
    { key: 'tong_so_vu_chay', title: 'Tổng số vụ cháy', type: 'number' },
    { key: 'tong_so_vu_cnch', title: 'Tổng số vụ CNCH', type: 'number' },
    { key: 'tong_xe_hu_hong', title: 'Tổng xe hư hỏng', type: 'number' },
    { key: 'cong_tac_an_ninh', title: 'Công tác an ninh', type: 'text' }
  ]
}

export function getColumnsForTab(tab: DomainRowType): GridColumn[] {
  return COLUMNS_BY_TAB[tab] || []
}

export const OPERATION_FIELDS: Array<{ key: string; label: string; type: 'text' | 'number' }> = [
  { key: 'so_bao_cao', label: 'Số báo cáo', type: 'text' },
  { key: 'don_vi_bao_cao', label: 'Đơn vị báo cáo', type: 'text' },
  { key: 'thoi_gian_tu_den', label: 'Thời gian từ đến', type: 'text' },
  { key: 'quan_so_truc', label: 'Quân số trực', type: 'number' },
  { key: 'tong_bao_cao', label: 'Tổng báo cáo', type: 'number' },
  { key: 'chi_tiet_cnch', label: 'Chi tiết CNCH / SCLQ', type: 'text' },
  { key: 'tong_chi_vien', label: 'Tổng chi viện', type: 'number' },
  { key: 'tong_cong_van', label: 'Tổng công văn', type: 'number' },
  { key: 'tong_ke_hoach', label: 'Tổng kế hoạch', type: 'number' },
  { key: 'tong_so_vu_no', label: 'Tổng số vụ nổ', type: 'number' },
  { key: 'tong_so_vu_chay', label: 'Tổng số vụ cháy', type: 'number' },
  { key: 'tong_so_vu_cnch', label: 'Tổng số vụ CNCH', type: 'number' },
  { key: 'tong_xe_hu_hong', label: 'Tổng xe hư hỏng', type: 'number' },
  { key: 'cong_tac_an_ninh', label: 'Công tác an ninh', type: 'text' }
]
