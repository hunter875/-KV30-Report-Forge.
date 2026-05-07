import { GridColumn } from '@/types/report'

export const BC_NGAY_COLUMNS: (GridColumn & {
  group?: string | null
  subgroup?: string | null
})[] = [
  { key: 'ngay', title: 'NGÀY', type: 'number', width: 60, group: '', subgroup: null },
  { key: 'thang', title: 'THÁNG', type: 'number', width: 60, group: '', subgroup: null },

  // Group: VỤ CHÁY VÀ CNCH
  { key: 'vu_chay_thong_ke', title: 'VỤ CHÁY THỐNG KÊ', type: 'number', width: 90, group: 'VỤ CHÁY VÀ CNCH', subgroup: null },
  { key: 'sclq_den_pccc_cnch', title: 'SCLQ ĐẾN PCCC&CNCH', type: 'number', width: 110, group: 'VỤ CHÁY VÀ CNCH', subgroup: null },
  { key: 'chi_vien', title: 'CHI VIỆN', type: 'number', width: 80, group: 'VỤ CHÁY VÀ CNCH', subgroup: null },
  { key: 'cnch', title: 'CNCH', type: 'number', width: 80, group: 'VỤ CHÁY VÀ CNCH', subgroup: null },

  // Group: CÔNG TÁC KIỂM TRA
  { key: 'dinh_ky_nhom_i', title: 'NHÓM I', type: 'number', width: 80, group: 'CÔNG TÁC KIỂM TRA', subgroup: 'ĐỊNH KỲ' },
  { key: 'dinh_ky_nhom_ii', title: 'NHÓM II', type: 'number', width: 80, group: 'CÔNG TÁC KIỂM TRA', subgroup: 'ĐỊNH KỲ' },
  { key: 'dot_xuat_nhom_i', title: 'NHÓM I', type: 'number', width: 80, group: 'CÔNG TÁC KIỂM TRA', subgroup: 'ĐỘT XUẤT' },
  { key: 'dot_xuat_nhom_ii', title: 'NHÓM II', type: 'number', width: 80, group: 'CÔNG TÁC KIỂM TRA', subgroup: 'ĐỘT XUẤT' },
  { key: 'huong_dan', title: 'HƯỚNG DẪN', type: 'number', width: 90, group: 'CÔNG TÁC KIỂM TRA', subgroup: null },
  { key: 'kien_nghi', title: 'KIẾN NGHỊ', type: 'number', width: 90, group: 'CÔNG TÁC KIỂM TRA', subgroup: null },
  { key: 'xu_phat', title: 'XỬ PHẠT', type: 'number', width: 90, group: 'CÔNG TÁC KIỂM TRA', subgroup: null },
  { key: 'tien_phat_trieu_dong', title: 'TIỀN PHẠT (triệu đồng)', type: 'number', width: 110, group: 'CÔNG TÁC KIỂM TRA', subgroup: null },
  { key: 'dinh_chi', title: 'ĐÌNH CHỈ', type: 'number', width: 90, group: 'CÔNG TÁC KIỂM TRA', subgroup: null },
  { key: 'phuc_hoi', title: 'PHỤC HỒI', type: 'number', width: 90, group: 'CÔNG TÁC KIỂM TRA', subgroup: null },

  // Group: TUYÊN TRUYỀN PCCC
  { key: 'tin_bai', title: 'TIN BÀI', type: 'number', width: 90, group: 'TUYÊN TRUYỀN PCCC', subgroup: null },
  { key: 'phong_su', title: 'PHÓNG SỰ', type: 'number', width: 90, group: 'TUYÊN TRUYỀN PCCC', subgroup: null },
  { key: 'so_lop_tuyen_truyen', title: 'SỐ LỚP TUYÊN TRUYỀN', type: 'number', width: 110, group: 'TUYÊN TRUYỀN PCCC', subgroup: null },
  { key: 'so_nguoi_tham_du_tuyen_truyen', title: 'SỐ NGƯỜI THAM DỰ', type: 'number', width: 110, group: 'TUYÊN TRUYỀN PCCC', subgroup: null },
  { key: 'so_khuyen_cao_to_roi_da_phat', title: 'SỐ KHUYẾN CÁO, TỜ RƠI ĐÃ PHÁT', type: 'number', width: 120, group: 'TUYÊN TRUYỀN PCCC', subgroup: null },

  // Group: HUẤN LUYỆN PCCC
  { key: 'so_lop_huan_luyen', title: 'SỐ LỚP HUẤN LUYỆN', type: 'number', width: 100, group: 'HUẤN LUYỆN PCCC', subgroup: null },
  { key: 'so_nguoi_tham_du_huan_luyen', title: 'SỐ NGƯỜI THAM DỰ', type: 'number', width: 110, group: 'HUẤN LUYỆN PCCC', subgroup: null },

  // Group: TỔNG TUYÊN HUẤN LUYỆN
  { key: 'tong_so_lop', title: 'SỐ LỚP', type: 'number', width: 90, group: 'TỔNG TUYÊN HUẤN LUYỆN', subgroup: null },
  { key: 'tong_so_nguoi_tham_du', title: 'SỐ NGƯỜI THAM DỰ', type: 'number', width: 110, group: 'TỔNG TUYÊN HUẤN LUYỆN', subgroup: null },

  // Group: PACC&CNCH của cơ sở theo mẫu PC06
  { key: 'pc06_so_pa_xay_dung_va_phe_duyet', title: 'SỐ PA XÂY DỰNG VÀ PHÊ DUYỆT', type: 'number', width: 110, group: 'PACC&CNCH của cơ sở theo mẫu PC06', subgroup: null },
  { key: 'pc06_so_pa_duoc_thuc_tap', title: 'SỐ PA ĐƯỢC THỰC TẬP', type: 'number', width: 110, group: 'PACC&CNCH của cơ sở theo mẫu PC06', subgroup: null },

  // Group: PACC&CNCH của CQ CA theo mẫu PC08
  { key: 'pc08_so_pa_xay_dung_va_phe_duyet', title: 'SỐ PA XÂY DỰNG VÀ PHÊ DUYỆT', type: 'number', width: 110, group: 'PACC&CNCH của CQ CA theo mẫu PC08', subgroup: null },
  { key: 'pc08_so_pa_duoc_thuc_tap', title: 'SỐ PA ĐƯỢC THỰC TẬP', type: 'number', width: 110, group: 'PACC&CNCH của CQ CA theo mẫu PC08', subgroup: null },

  // Group: PA CNCH của CQ CA theo mẫu PC09
  { key: 'pc09_so_pa_xay_dung_va_phe_duyet', title: 'SỐ PA XÂY DỰNG VÀ PHÊ DUYỆT', type: 'number', width: 110, group: 'PA CNCH của CQ CA theo mẫu PC09', subgroup: null },
  { key: 'pc09_so_pa_duoc_thuc_tap', title: 'SỐ PA ĐƯỢC THỰC TẬP', type: 'number', width: 110, group: 'PA CNCH của CQ CA theo mẫu PC09', subgroup: null },

  // Group: PACC&CNCH của phương tiện giao thông theo mẫu PC07
  { key: 'pc07_so_pa_xay_dung_va_phe_duyet', title: 'SỐ PA XÂY DỰNG VÀ PHÊ DUYỆT', type: 'number', width: 110, group: 'PACC&CNCH của phương tiện giao thông theo mẫu PC07', subgroup: null },
  { key: 'pc07_so_pa_duoc_thuc_tap', title: 'SỐ PA ĐƯỢC THỰC TẬP', type: 'number', width: 110, group: 'PACC&CNCH của phương tiện giao thông theo mẫu PC07', subgroup: null },

  { key: 'ghi_chu', title: 'Ghi chú', type: 'text', width: 160, group: null, subgroup: null }
]
