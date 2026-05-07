export interface ReportRow {
  id: string
  row_type: DomainRowType | null
  stt: number | null
  payload: Record<string, any>
}

export interface Report {
  id: string
  title: string
  report_date: string | null
  version: number
  created_at: string
  updated_at: string | null
  rows: ReportRow[]
}

// Operation types for bulk updates
export type Operation = CreateOperation | UpdateOperation | DeleteOperation

export interface CreateOperation {
  type: 'create'
  temp_id?: string
  row_type: DomainRowType
  stt?: number
  data: Record<string, any>
}

export interface UpdateOperation {
  type: 'update'
  row_id: string
  row_type: DomainRowType
  stt?: number
  data: Record<string, any>
}

export interface DeleteOperation {
  type: 'delete'
  row_id: string
}

export interface BulkOperationsRequest {
  version: number
  operations: Operation[]
}

export interface BulkResponse {
  status: 'ok' | 'conflict' | 'error'
  version?: number
  server_version?: number
  message?: string
}

// Save status for UI feedback
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'conflict' | 'error'

// Four source tables used to build the canonical report JSON.
export type ReportTab =
  | 'bc_ngay'
  | 'cnch'
  | 'sclq'

// Row type enum matching backend domain
export type DomainRowType =
  | 'statistics'        // BC NGÀY - maps to bang_thong_ke
  | 'cnch_event'        // CNCH - maps to danh_sach_cnch
  | 'sclq'              // SCLQ - new collection
  | 'tong_vu_chay'      // TỔNG VỤ CHÁY - new collection
  | 'operation'         // Hidden export metadata; not shown as a spreadsheet tab.

// Grid column definition
export interface GridColumn {
  key: string
  title: string
  type: 'text' | 'number' | 'date'
  width?: number
  readonly?: boolean
}

// Grid row (what user sees in the spreadsheet)
export interface GridRow {
  id?: string
  temp_id?: string
  stt?: number
  [key: string]: any
}

// Key-value row for operation table (single row)
export interface KeyValueRow {
  row_id?: string
  key: string
  label: string
  value: any
  type: 'text' | 'number'
}

// Canonical report structure (as per backend)
export interface StatisticRow {
  stt: string
  noi_dung: string
  ket_qua: number
}

export interface CnchEvent {
  stt: number
  mo_ta?: string
  dia_diem?: string
  thiet_hai?: string
  thoi_gian?: string
  ngay_xay_ra?: string
  ket_qua_xu_ly?: string
  noi_dung_tin_bao?: string
  luc_luong_tham_gia?: string
  thong_tin_nan_nhan?: string
}

export interface SclqEvent {
  stt: number
  vu_chay_ngay: string
  dia_diem: string
  nguyen_nhan: string
  thiet_hai: string
  chi_huy_chua_chay: string
  ghi_chu: string
}

export interface TongVuChayEvent {
  stt: number
  ngay_xay_ra: string
  vu_chay: string
  thoi_gian: string
  dia_diem: string
  phan_loai: string
  nguyen_nhan: string
  thiet_hai_ve_nguoi: string
  thiet_hai_tai_san: string
  tai_san_cuu_chua: string
  thoi_gian_toi_dam_chay: string
  thoi_gian_khong_che: string
  thoi_gian_dap_tat_hoan_toan: string
  so_luong_xe: number
  chi_huy_chua_chay: string
  ghi_chu: string
}

export interface DetailedOperations {
  quan_so_truc: number
  tong_bao_cao: number
  chi_tiet_cnch: string
  tong_chi_vien: number
  tong_cong_van: number
  tong_ke_hoach: number
  tong_so_vu_no: number
  tong_so_vu_chay: number
  tong_so_vu_cnch: number
  tong_xe_hu_hong: number
  cong_tac_an_ninh: string
  tong_quan_so?: number
  quan_so_bien_che?: number
  quan_so_csnv?: number
  quan_so_hdld?: number
  truc_chi_huy?: number
  truc_ban_chien_dau?: number
  xe_chi_huy?: number
  xe_chua_chay?: number
  xe_bon_nuoc?: number
  xe_thang?: number
  xe_cho_quan?: number
  xe_cho_phuong_tien?: number
  huong_dan_kiem_tra?: number
  co_so_nhom_1?: number
  co_so_nhom_2?: number
  tinh_trang_tru_cap_nuoc?: string
}

export interface CanonicalReport {
  header: any
  bang_thong_ke: StatisticRow[]
  danh_sach_cnch: CnchEvent[]
  danh_sach_sclq?: SclqEvent[]
  danh_sach_tong_vu_chay?: TongVuChayEvent[]
  danh_sach_cong_tac_khac?: string[]
  danh_sach_cong_van_tham_muu?: any[]
  danh_sach_phuong_tien_hu_hong?: any[]
  phan_I_va_II_chi_tiet_nghiep_vu: DetailedOperations
}

export type ThemeMode = 'light' | 'dark'

export type ActiveReportMode = 'input' | 'daily_report' | 'weekly_report'

export interface DateRange {
  startDate: string
  endDate: string
}

export interface ImportPreviewSheet {
  row_type: DomainRowType
  label: string
  sheet_name: string
  row_count: number
  raw_rows: number
  date_errors: string[]
  warnings: string[]
  errors: string[]
  sample_rows: Record<string, any>[]
  sample_dates: string[]
}

export interface ImportPreview {
  status: string
  mode: 'single' | 'workbook'
  can_import: boolean
  sheets: ImportPreviewSheet[]
}

export interface ReportOverrideEnvelope {
  exists: boolean
  mode: ActiveReportMode
  start_date: string
  end_date: string
  data: CanonicalReport | null
  updated_at?: string | null
}
