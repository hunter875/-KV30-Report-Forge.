import React, { useEffect, useMemo, useState } from 'react'
import {
  CanonicalReport,
  CnchEvent,
  DetailedOperations,
  SclqEvent,
  ThemeMode
} from '@/types/report'

interface ReportSupplementModalProps {
  open: boolean
  data: CanonicalReport
  theme: ThemeMode
  onClose: () => void
  onApply: (data: CanonicalReport) => void
}

type StatConfig = {
  stt: string
  label: string
  hint?: string
}

type OperationField = {
  key: keyof DetailedOperations
  label: string
  type: 'number' | 'text'
  defaultValue: number | string
  textarea?: boolean
}

const STAT_LABELS: Record<string, string> = {
  '3': 'Số người chết do cháy',
  '4': 'Số người bị thương do cháy',
  '5': 'Số người cứu được trong vụ cháy',
  '6': 'Tài sản thiệt hại do cháy (triệu đồng)',
  '7': 'Tài sản cứu được do cháy (triệu đồng)',
  '9': 'Số người chết do nổ',
  '10': 'Số người bị thương do nổ',
  '11': 'Số người cứu được trong vụ nổ',
  '12': 'Tài sản thiệt hại do nổ (triệu đồng)',
  '13': 'Tài sản cứu được do nổ (triệu đồng)',
  '16': 'CNCH - số người trực tiếp cứu được',
  '17': 'CNCH - số người hướng dẫn tự thoát nạn',
  '18': 'CNCH - số thi thể nạn nhân tìm được',
  '19': 'CNCH - tài sản cứu được (triệu đồng)',
  '25': 'Số video, clip được đăng tải',
  '36': 'Xử phạt - phạt cảnh cáo',
  '37': 'Xử phạt - tạm đình chỉ hoạt động',
  '56': 'Huấn luyện - Chỉ huy phòng',
  '57': 'Huấn luyện - Chỉ huy Đội',
  '58': 'Huấn luyện - Cán bộ tiểu đội',
  '59': 'Huấn luyện - Chiến sỹ CC và CNCH',
  '60': 'Huấn luyện - Lái xe CC và CNCH',
  '61': 'Huấn luyện - Lái tàu CC và CNCH'
}

const STAT_SECTIONS: Array<{ title: string; items: StatConfig[] }> = [
  {
    title: 'Cháy, nổ và CNCH chưa lấy đủ từ 3 bảng',
    items: [
      { stt: '3', label: STAT_LABELS['3'] },
      { stt: '4', label: STAT_LABELS['4'] },
      { stt: '5', label: STAT_LABELS['5'] },
      { stt: '6', label: STAT_LABELS['6'] },
      { stt: '7', label: STAT_LABELS['7'] },
      { stt: '9', label: STAT_LABELS['9'] },
      { stt: '10', label: STAT_LABELS['10'] },
      { stt: '11', label: STAT_LABELS['11'] },
      { stt: '12', label: STAT_LABELS['12'] },
      { stt: '13', label: STAT_LABELS['13'] },
      { stt: '16', label: STAT_LABELS['16'], hint: 'Nếu bảng CNCH có số người cứu được thì hệ thống đã cộng sẵn, có thể chỉnh lại ở đây.' },
      { stt: '17', label: STAT_LABELS['17'] },
      { stt: '18', label: STAT_LABELS['18'] },
      { stt: '19', label: STAT_LABELS['19'] }
    ]
  },
  {
    title: 'Tuyên truyền, kiểm tra và xử phạt bổ sung',
    items: [
      { stt: '25', label: STAT_LABELS['25'] },
      { stt: '36', label: STAT_LABELS['36'] },
      { stt: '37', label: STAT_LABELS['37'] }
    ]
  },
  {
    title: 'Huấn luyện do user nhập',
    items: [
      { stt: '56', label: STAT_LABELS['56'] },
      { stt: '57', label: STAT_LABELS['57'] },
      { stt: '58', label: STAT_LABELS['58'] },
      { stt: '59', label: STAT_LABELS['59'] },
      { stt: '60', label: STAT_LABELS['60'] },
      { stt: '61', label: STAT_LABELS['61'] }
    ]
  }
]

const OPERATION_FIELDS: OperationField[] = [
  { key: 'quan_so_truc', label: 'Quân số trực', type: 'number', defaultValue: 0 },
  { key: 'tong_quan_so', label: 'Tổng quân số', type: 'number', defaultValue: 0 },
  { key: 'quan_so_bien_che', label: 'Biên chế', type: 'number', defaultValue: 0 },
  { key: 'quan_so_csnv', label: 'Chiến sĩ nghĩa vụ', type: 'number', defaultValue: 0 },
  { key: 'quan_so_hdld', label: 'Hợp đồng lao động', type: 'number', defaultValue: 0 },
  { key: 'truc_chi_huy', label: 'Trực chỉ huy', type: 'number', defaultValue: 0 },
  { key: 'truc_ban_chien_dau', label: 'Trực ban chiến đấu', type: 'number', defaultValue: 0 },
  { key: 'xe_chi_huy', label: 'Xe chỉ huy', type: 'number', defaultValue: 0 },
  { key: 'xe_chua_chay', label: 'Xe chữa cháy', type: 'number', defaultValue: 0 },
  { key: 'xe_bon_nuoc', label: 'Xe bồn nước', type: 'number', defaultValue: 0 },
  { key: 'xe_thang', label: 'Xe thang', type: 'number', defaultValue: 0 },
  { key: 'xe_cho_quan', label: 'Xe chở quân', type: 'number', defaultValue: 0 },
  { key: 'xe_cho_phuong_tien', label: 'Xe chở phương tiện', type: 'number', defaultValue: 0 },
  { key: 'tong_chi_vien', label: 'Tổng chi viện', type: 'number', defaultValue: 0 },
  { key: 'tong_bao_cao', label: 'Tổng báo cáo', type: 'number', defaultValue: 0 },
  { key: 'tong_cong_van', label: 'Tổng công văn', type: 'number', defaultValue: 0 },
  { key: 'tong_ke_hoach', label: 'Tổng kế hoạch', type: 'number', defaultValue: 0 },
  { key: 'tong_xe_hu_hong', label: 'Tổng xe hư hỏng', type: 'number', defaultValue: 0 },
  { key: 'huong_dan_kiem_tra', label: 'Hướng dẫn kiểm tra', type: 'number', defaultValue: 0 },
  { key: 'co_so_nhom_1', label: 'Cơ sở nhóm I', type: 'number', defaultValue: 0 },
  { key: 'co_so_nhom_2', label: 'Cơ sở nhóm II', type: 'number', defaultValue: 0 },
  { key: 'cong_tac_an_ninh', label: 'Công tác an ninh', type: 'text', defaultValue: 'Không.' },
  { key: 'tinh_trang_tru_cap_nuoc', label: 'Tình trạng trụ cấp nước', type: 'text', defaultValue: 'Không.' },
  { key: 'chi_tiet_cnch', label: 'Chi tiết CNCH / sự cố đưa vào lời văn', type: 'text', defaultValue: '', textarea: true }
]

const DEFAULT_OPERATIONS: DetailedOperations = {
  quan_so_truc: 0,
  tong_bao_cao: 0,
  chi_tiet_cnch: '',
  tong_chi_vien: 0,
  tong_cong_van: 0,
  tong_ke_hoach: 0,
  tong_so_vu_no: 0,
  tong_so_vu_chay: 0,
  tong_so_vu_cnch: 0,
  tong_xe_hu_hong: 0,
  cong_tac_an_ninh: 'Không.',
  tinh_trang_tru_cap_nuoc: 'Không.'
}

const CNCH_COLUMNS: Array<{ key: keyof CnchEvent; label: string; width: number }> = [
  { key: 'noi_dung_tin_bao', label: 'Nội dung tin báo', width: 180 },
  { key: 'ngay_xay_ra', label: 'Ngày', width: 120 },
  { key: 'thoi_gian', label: 'Thời gian', width: 140 },
  { key: 'dia_diem', label: 'Địa điểm', width: 260 },
  { key: 'luc_luong_tham_gia', label: 'Lực lượng', width: 220 },
  { key: 'ket_qua_xu_ly', label: 'Kết quả xử lý', width: 160 },
  { key: 'thiet_hai', label: 'Thiệt hại', width: 120 },
  { key: 'thong_tin_nan_nhan', label: 'Nạn nhân', width: 120 }
]

const SCLQ_COLUMNS: Array<{ key: keyof SclqEvent; label: string; width: number }> = [
  { key: 'vu_chay_ngay', label: 'Ngày', width: 120 },
  { key: 'dia_diem', label: 'Địa điểm', width: 280 },
  { key: 'nguyen_nhan', label: 'Nguyên nhân / nội dung', width: 220 },
  { key: 'thiet_hai', label: 'Thiệt hại', width: 140 },
  { key: 'chi_huy_chua_chay', label: 'Chỉ huy', width: 180 },
  { key: 'ghi_chu', label: 'Ghi chú', width: 180 }
]

export const ReportSupplementModal: React.FC<ReportSupplementModalProps> = ({
  open,
  data,
  theme,
  onClose,
  onApply
}) => {
  const [draft, setDraft] = useState<CanonicalReport>(() => normalizeReport(data))
  const isDark = theme === 'dark'

  useEffect(() => {
    if (open) {
      setDraft(normalizeReport(data))
    }
  }, [data, open])

  const palette = useMemo(() => ({
    modal: isDark ? '#0f172a' : '#ffffff',
    panel: isDark ? '#111827' : '#f8fafc',
    subpanel: isDark ? '#1e293b' : '#ffffff',
    text: isDark ? '#e5e7eb' : '#101828',
    muted: isDark ? '#94a3b8' : '#667085',
    border: isDark ? '#334155' : '#d0d5dd',
    input: isDark ? '#020617' : '#ffffff',
    th: isDark ? '#1f2937' : '#eef2f7'
  }), [isDark])

  if (!open) return null

  const setStatValue = (stt: string, value: string) => {
    setDraft(current => {
      const next = normalizeReport(current)
      upsertStat(next, stt, toNumber(value), STAT_LABELS[stt])
      return recomputeFormulaRows(next)
    })
  }

  const setOperationValue = (field: OperationField, value: string) => {
    setDraft(current => {
      const next = normalizeReport(current)
      const operations = next.phan_I_va_II_chi_tiet_nghiep_vu as unknown as Record<string, number | string | undefined>
      operations[String(field.key)] = field.type === 'number' ? toNumber(value) : value
      return next
    })
  }

  const updateCnch = (index: number, key: keyof CnchEvent, value: string) => {
    setDraft(current => {
      const next = normalizeReport(current)
      next.danh_sach_cnch[index] = {
        ...next.danh_sach_cnch[index],
        [key]: value
      }
      return renumberEventLists(next)
    })
  }

  const updateSclq = (index: number, key: keyof SclqEvent, value: string) => {
    setDraft(current => {
      const next = normalizeReport(current)
      next.danh_sach_sclq = next.danh_sach_sclq || []
      next.danh_sach_sclq[index] = {
        ...next.danh_sach_sclq[index],
        [key]: value
      }
      return renumberEventLists(next)
    })
  }

  const addCnch = () => {
    setDraft(current => {
      const next = normalizeReport(current)
      next.danh_sach_cnch.push({
        stt: next.danh_sach_cnch.length + 1,
        mo_ta: '',
        dia_diem: '',
        thiet_hai: '',
        thoi_gian: '',
        ngay_xay_ra: '',
        ket_qua_xu_ly: 'Không',
        noi_dung_tin_bao: '',
        luc_luong_tham_gia: '',
        thong_tin_nan_nhan: ''
      })
      return next
    })
  }

  const addSclq = () => {
    setDraft(current => {
      const next = normalizeReport(current)
      next.danh_sach_sclq = next.danh_sach_sclq || []
      next.danh_sach_sclq.push({
        stt: next.danh_sach_sclq.length + 1,
        vu_chay_ngay: '',
        dia_diem: '',
        nguyen_nhan: '',
        thiet_hai: 'Không',
        chi_huy_chua_chay: '',
        ghi_chu: ''
      })
      return next
    })
  }

  const removeCnch = (index: number) => {
    setDraft(current => {
      const next = normalizeReport(current)
      next.danh_sach_cnch = next.danh_sach_cnch.filter((_, rowIndex) => rowIndex !== index)
      return renumberEventLists(next)
    })
  }

  const removeSclq = (index: number) => {
    setDraft(current => {
      const next = normalizeReport(current)
      next.danh_sach_sclq = (next.danh_sach_sclq || []).filter((_, rowIndex) => rowIndex !== index)
      return renumberEventLists(next)
    })
  }

  const applyDraft = () => {
    onApply(recomputeFormulaRows(renumberEventLists(normalizeReport(draft))))
  }

  const formulaSummary = [
    { stt: '15', label: 'CNCH cứu người = STT16 + STT17' },
    { stt: '31', label: 'Kiểm tra PCCC = STT32 + STT33' },
    { stt: '35', label: 'Xử phạt = STT36 + STT37 + STT38 + STT39' },
    { stt: '55', label: 'Huấn luyện = STT56 + ... + STT61' }
  ]

  return (
    <div
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(15, 23, 42, 0.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: 'min(1280px, 96vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: palette.modal,
          color: palette.text,
          border: `1px solid ${palette.border}`,
          boxShadow: '0 24px 72px rgba(2, 6, 23, 0.38)'
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: `1px solid ${palette.border}`, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Bổ sung dữ liệu báo cáo</h2>
            <div style={{ marginTop: 4, color: palette.muted, fontSize: 13 }}>
              Dùng cho các trường chưa có trong 3 bảng nguồn. Bỏ qua thì hệ thống giữ số hiện tại hoặc mặc định an toàn.
            </div>
          </div>
          <button onClick={onClose} style={ghostButtonStyle(palette.border, palette.text, palette.subpanel)}>
            Skip
          </button>
        </div>

        <div style={{ overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section style={sectionStyle(palette.panel, palette.border)}>
            <h3 style={headingStyle}>Các dòng tổng tự tính lại</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {formulaSummary.map(item => (
                <div key={item.stt} style={{ padding: 10, background: palette.subpanel, border: `1px solid ${palette.border}` }}>
                  <div style={{ fontSize: 12, color: palette.muted }}>{item.label}</div>
                  <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800 }}>{getStatValue(draft, item.stt)}</div>
                </div>
              ))}
            </div>
          </section>

          {STAT_SECTIONS.map(section => (
            <section key={section.title} style={sectionStyle(palette.panel, palette.border)}>
              <h3 style={headingStyle}>{section.title}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                {section.items.map(item => (
                  <label key={item.stt} style={labelStyle(palette.text)}>
                    <span>STT {item.stt} - {statLabel(draft, item)}</span>
                    <input
                      type="number"
                      value={String(getStatValue(draft, item.stt))}
                      onChange={event => setStatValue(item.stt, event.target.value)}
                      style={inputStyle(palette.input, palette.text, palette.border)}
                    />
                    {item.hint && <small style={{ color: palette.muted, lineHeight: 1.35 }}>{item.hint}</small>}
                  </label>
                ))}
              </div>
            </section>
          ))}

          <section style={sectionStyle(palette.panel, palette.border)}>
            <h3 style={headingStyle}>Thông tin mặc định, quân số và phương tiện</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {OPERATION_FIELDS.map(field => (
                <label key={field.key} style={labelStyle(palette.text)}>
                  <span>{field.label}</span>
                  {field.textarea ? (
                    <textarea
                      value={String(draft.phan_I_va_II_chi_tiet_nghiep_vu[field.key] ?? field.defaultValue)}
                      onChange={event => setOperationValue(field, event.target.value)}
                      rows={4}
                      style={{ ...inputStyle(palette.input, palette.text, palette.border), resize: 'vertical', minHeight: 92 }}
                    />
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={String(draft.phan_I_va_II_chi_tiet_nghiep_vu[field.key] ?? field.defaultValue)}
                      onChange={event => setOperationValue(field, event.target.value)}
                      style={inputStyle(palette.input, palette.text, palette.border)}
                    />
                  )}
                </label>
              ))}
            </div>
          </section>

          <EditableEventTable<CnchEvent>
            title="Chỉnh danh sách CNCH"
            rows={draft.danh_sach_cnch}
            columns={CNCH_COLUMNS}
            palette={palette}
            onAdd={addCnch}
            onRemove={removeCnch}
            onChange={updateCnch}
          />

          <EditableEventTable<SclqEvent>
            title="Chỉnh danh sách SCLQ"
            rows={draft.danh_sach_sclq || []}
            columns={SCLQ_COLUMNS}
            palette={palette}
            onAdd={addSclq}
            onRemove={removeSclq}
            onChange={updateSclq}
          />
        </div>

        <div style={{ padding: '14px 20px', borderTop: `1px solid ${palette.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={ghostButtonStyle(palette.border, palette.text, palette.subpanel)}>
            Bỏ qua
          </button>
          <button onClick={applyDraft} style={primaryButtonStyle}>
            Áp dụng vào JSON
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditableTableProps<T extends { stt: number }> {
  title: string
  rows: T[]
  columns: Array<{ key: keyof T; label: string; width: number }>
  palette: {
    panel: string
    subpanel: string
    text: string
    muted: string
    border: string
    input: string
    th: string
  }
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, key: keyof T, value: string) => void
}

function EditableEventTable<T extends { stt: number }>({
  title,
  rows,
  columns,
  palette,
  onAdd,
  onRemove,
  onChange
}: EditableTableProps<T>) {
  return (
    <section style={sectionStyle(palette.panel, palette.border)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <h3 style={headingStyle}>{title}</h3>
          <div style={{ color: palette.muted, fontSize: 12 }}>Có thể sửa trực tiếp nội dung sẽ đưa vào báo cáo Word.</div>
        </div>
        <button onClick={onAdd} style={ghostButtonStyle(palette.border, palette.text, palette.subpanel)}>
          Thêm dòng
        </button>
      </div>
      <div style={{ overflowX: 'auto', border: `1px solid ${palette.border}` }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: columns.reduce((sum, column) => sum + column.width, 92) }}>
          <thead>
            <tr>
              <th style={thStyle(palette.th, palette.border, palette.text, 52)}>STT</th>
              {columns.map(column => (
                <th key={String(column.key)} style={thStyle(palette.th, palette.border, palette.text, column.width)}>{column.label}</th>
              ))}
              <th style={thStyle(palette.th, palette.border, palette.text, 70)} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} style={{ padding: 18, color: palette.muted, textAlign: 'center', borderTop: `1px solid ${palette.border}` }}>
                  Chưa có dòng nào trong khoảng báo cáo này.
                </td>
              </tr>
            ) : rows.map((row, rowIndex) => (
              <tr key={`${row.stt}-${rowIndex}`}>
                <td style={tdStyle(palette.border, palette.text, 52)}>{rowIndex + 1}</td>
                {columns.map(column => (
                  <td key={String(column.key)} style={tdStyle(palette.border, palette.text, column.width)}>
                    <input
                      value={String(row[column.key] ?? '')}
                      onChange={event => onChange(rowIndex, column.key, event.target.value)}
                      style={{ ...inputStyle(palette.input, palette.text, palette.border), border: 'none', minWidth: column.width - 18 }}
                    />
                  </td>
                ))}
                <td style={tdStyle(palette.border, palette.text, 70)}>
                  <button onClick={() => onRemove(rowIndex)} style={dangerButtonStyle}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function normalizeReport(report: CanonicalReport): CanonicalReport {
  const next = JSON.parse(JSON.stringify(report || {})) as CanonicalReport
  next.header = next.header || {}
  next.header.don_vi_bao_cao = next.header.don_vi_bao_cao || 'ĐỘI CC&CNCH KHU VỰC 30'
  next.bang_thong_ke = Array.isArray(next.bang_thong_ke) ? next.bang_thong_ke : []
  next.danh_sach_cnch = Array.isArray(next.danh_sach_cnch) ? next.danh_sach_cnch : []
  next.danh_sach_sclq = Array.isArray(next.danh_sach_sclq) ? next.danh_sach_sclq : []
  next.phan_I_va_II_chi_tiet_nghiep_vu = {
    ...DEFAULT_OPERATIONS,
    ...(next.phan_I_va_II_chi_tiet_nghiep_vu || {})
  }

  for (const label of Object.entries(STAT_LABELS)) {
    upsertStat(next, label[0], getStatValue(next, label[0]), label[1])
  }

  return recomputeFormulaRows(renumberEventLists(sortStats(next)))
}

function sortStats(report: CanonicalReport): CanonicalReport {
  report.bang_thong_ke = report.bang_thong_ke.sort((a, b) => toNumber(a.stt) - toNumber(b.stt))
  return report
}

function renumberEventLists(report: CanonicalReport): CanonicalReport {
  report.danh_sach_cnch = report.danh_sach_cnch.map((row, index) => ({ ...row, stt: index + 1 }))
  report.danh_sach_sclq = (report.danh_sach_sclq || []).map((row, index) => ({ ...row, stt: index + 1 }))
  return report
}

function recomputeFormulaRows(report: CanonicalReport): CanonicalReport {
  upsertStat(report, '15', getStatValue(report, '16') + getStatValue(report, '17'))
  upsertStat(report, '31', getStatValue(report, '32') + getStatValue(report, '33'))
  upsertStat(report, '35', getStatValue(report, '36') + getStatValue(report, '37') + getStatValue(report, '38') + getStatValue(report, '39'))
  upsertStat(
    report,
    '55',
    ['56', '57', '58', '59', '60', '61'].reduce((total, stt) => total + getStatValue(report, stt), 0)
  )
  return sortStats(report)
}

function getStatValue(report: CanonicalReport, stt: string): number {
  const row = report.bang_thong_ke.find(item => item.stt === stt)
  return toNumber(row?.ket_qua)
}

function upsertStat(report: CanonicalReport, stt: string, value: number, fallbackLabel?: string) {
  let row = report.bang_thong_ke.find(item => item.stt === stt)
  if (!row) {
    row = { stt, noi_dung: fallbackLabel || STAT_LABELS[stt] || `STT ${stt}`, ket_qua: 0 }
    report.bang_thong_ke.push(row)
  }
  row.ket_qua = value
  if (!row.noi_dung) {
    row.noi_dung = fallbackLabel || STAT_LABELS[stt] || `STT ${stt}`
  }
}

function statLabel(report: CanonicalReport, item: StatConfig): string {
  const row = report.bang_thong_ke.find(candidate => candidate.stt === item.stt)
  return row?.noi_dung || item.label
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const parsed = Number(String(value).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

const headingStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 15,
  fontWeight: 800
}

function sectionStyle(background: string, border: string): React.CSSProperties {
  return {
    background,
    border: `1px solid ${border}`,
    padding: 14
  }
}

function labelStyle(color: string): React.CSSProperties {
  return {
    display: 'grid',
    gap: 6,
    color,
    fontSize: 12,
    fontWeight: 700
  }
}

function inputStyle(background: string, color: string, border: string): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 9px',
    background,
    color,
    border: `1px solid ${border}`,
    outline: 'none',
    fontSize: 13
  }
}

function thStyle(background: string, border: string, color: string, width: number): React.CSSProperties {
  return {
    width,
    minWidth: width,
    padding: '8px',
    background,
    color,
    borderRight: `1px solid ${border}`,
    borderBottom: `1px solid ${border}`,
    textAlign: 'left',
    fontSize: 12
  }
}

function tdStyle(border: string, color: string, width: number): React.CSSProperties {
  return {
    width,
    minWidth: width,
    padding: 4,
    color,
    borderRight: `1px solid ${border}`,
    borderBottom: `1px solid ${border}`,
    fontSize: 12
  }
}

function ghostButtonStyle(border: string, color: string, background: string): React.CSSProperties {
  return {
    padding: '8px 12px',
    border: `1px solid ${border}`,
    background,
    color,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700
  }
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '9px 14px',
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 800
}

const dangerButtonStyle: React.CSSProperties = {
  padding: '6px 8px',
  border: 'none',
  background: '#b42318',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 700
}

export default ReportSupplementModal
