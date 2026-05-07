import { Report, ReportRow, GridRow, DomainRowType, KeyValueRow } from '@/types/report'

export function getRowsByTab(report: Report, tab: DomainRowType): GridRow[] {
  const savedRows = report.rows
    .filter(row => row.row_type === tab)
    .sort((a, b) => (a.stt ?? 0) - (b.stt ?? 0))
    .map(row => mapRowToGridRow(row))

  const minimumRows = tab === 'statistics' ? 31 : 10
  const spareRows = tab === 'statistics' ? 0 : 5
  const targetRows = Math.max(minimumRows, savedRows.length + spareRows)
  const usedStt = new Set(savedRows.map(row => row.stt).filter(Boolean))
  const rows = [...savedRows]

  for (let stt = 1; rows.length < targetRows; stt += 1) {
    if (usedStt.has(stt)) continue
    rows.push(createEmptyRow(tab, stt, undefined, report.report_date))
  }

  return rows.sort((a, b) => (a.stt ?? 0) - (b.stt ?? 0))
}

export function mapRowToGridRow(row: ReportRow): GridRow {
  return {
    id: row.id,
    stt: row.stt ?? undefined,
    ...row.payload
  }
}

export function getOperationRows(report: Report): KeyValueRow[] {
  const operationRows = report.rows.filter(row => row.row_type === 'operation')

  if (operationRows.length === 0) {
    return OPERATION_FIELD_KEYS.map(key => ({
      key,
      label: getOperationFieldLabel(key),
      value: '',
      type: getOperationFieldType(key)
    }))
  }

  const payload = operationRows[0].payload
  return OPERATION_FIELD_KEYS.map(key => ({
    row_id: operationRows[0].id,
    key,
    label: getOperationFieldLabel(key),
    value: payload[key] ?? '',
    type: getOperationFieldType(key)
  }))
}

export function keyValueRowsToPayload(rows: KeyValueRow[]): Record<string, any> {
  const payload: Record<string, any> = {}
  rows.forEach(row => {
    payload[row.key] = row.value
  })
  return payload
}

export function getNextStt(rows: GridRow[]): number {
  if (rows.length === 0) return 1
  const maxStt = Math.max(...rows.map(r => r.stt ?? 0))
  return maxStt + 1
}

export function createEmptyRow(
  rowType: DomainRowType,
  stt: number,
  existingId?: string,
  reportDate?: string | null
): GridRow {
  const base: GridRow = {
    id: existingId,
    temp_id: existingId ? undefined : `${rowType}-${stt}`,
    stt
  }
  const reportMonth = reportDate ? new Date(reportDate).getMonth() + 1 : new Date().getMonth() + 1

  switch (rowType) {
    case 'statistics':
      return {
        ...base,
        ngay: stt,
        thang: reportMonth
      }
    case 'cnch_event':
      return {
        ...base,
        loai_hinh_cnch: '',
        ngay_xay_ra: '',
        thoi_gian: '',
        dia_diem: '',
        dia_chi: '',
        chi_huy_cnch: '',
        thiet_hai_ve_nguoi: '',
        so_nguoi_cuu_duoc: ''
      }
    case 'sclq':
      return {
        ...base,
        vu_chay_ngay: '',
        dia_diem: '',
        nguyen_nhan: '',
        thiet_hai: '',
        chi_huy_chua_chay: '',
        ghi_chu: ''
      }
    case 'tong_vu_chay':
      return {
        ...base,
        ngay_xay_ra: '',
        vu_chay: '',
        thoi_gian: '',
        dia_diem: '',
        phan_loai: '',
        nguyen_nhan: '',
        thiet_hai_ve_nguoi: '',
        thiet_hai_tai_san: '',
        tai_san_cuu_chua: '',
        thoi_gian_toi_dam_chay: '',
        thoi_gian_khong_che: '',
        thoi_gian_dap_tat_hoan_toan: '',
        so_luong_xe: 0,
        chi_huy_chua_chay: '',
        ghi_chu: ''
      }
    default:
      return base
  }
}

export const OPERATION_FIELD_KEYS = [
  'so_bao_cao',
  'don_vi_bao_cao',
  'thoi_gian_tu_den',
  'quan_so_truc',
  'tong_bao_cao',
  'chi_tiet_cnch',
  'tong_chi_vien',
  'tong_cong_van',
  'tong_ke_hoach',
  'tong_so_vu_no',
  'tong_so_vu_chay',
  'tong_so_vu_cnch',
  'tong_xe_hu_hong',
  'cong_tac_an_ninh'
]

export function getOperationFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    so_bao_cao: 'Số báo cáo',
    don_vi_bao_cao: 'Đơn vị báo cáo',
    thoi_gian_tu_den: 'Thời gian từ đến',
    quan_so_truc: 'Quân số trực',
    tong_bao_cao: 'Tổng báo cáo',
    chi_tiet_cnch: 'Chi tiết CNCH / SCLQ',
    tong_chi_vien: 'Tổng chi viện',
    tong_cong_van: 'Tổng công văn',
    tong_ke_hoach: 'Tổng kế hoạch',
    tong_so_vu_no: 'Tổng số vụ nổ',
    tong_so_vu_chay: 'Tổng số vụ cháy',
    tong_so_vu_cnch: 'Tổng số vụ CNCH',
    tong_xe_hu_hong: 'Tổng xe hư hỏng',
    cong_tac_an_ninh: 'Công tác an ninh'
  }
  return labels[key] || key
}

export function getOperationFieldType(key: string): 'text' | 'number' {
  const numberFields = [
    'quan_so_truc',
    'tong_bao_cao',
    'tong_chi_vien',
    'tong_cong_van',
    'tong_ke_hoach',
    'tong_so_vu_no',
    'tong_so_vu_chay',
    'tong_so_vu_cnch',
    'tong_xe_hu_hong'
  ]
  return numberFields.includes(key) ? 'number' : 'text'
}
