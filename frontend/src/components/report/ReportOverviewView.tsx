import React, { useEffect, useMemo, useState } from 'react'
import { reportApi } from '@/features/report/api'
import { CanonicalReport, Report, ReportRow, ThemeMode } from '@/types/report'
import { ImportPanel } from './ImportPanel'

interface ReportOverviewViewProps {
  report: Report
  theme: ThemeMode
  onImported: () => Promise<void>
  selectedDate?: string
}

type Palette = {
  panel: string
  subpanel: string
  border: string
  text: string
  muted: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatViDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('vi-VN')
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function statValue(data: CanonicalReport | null, stt: string): number {
  const value = data?.bang_thong_ke.find(row => row.stt === stt)?.ket_qua
  return Number(value || 0)
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  const text = String(value).trim()
  const viMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (viMatch) {
    const [, day, month, year] = viMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return null
}

function isStatisticsRowForDate(row: ReportRow, isoDate: string): boolean {
  const date = new Date(`${isoDate}T00:00:00`)
  return (
    row.row_type === 'statistics' &&
    toNumber(row.payload.ngay) === date.getDate() &&
    toNumber(row.payload.thang) === date.getMonth() + 1
  )
}

function rowsForDate(rows: ReportRow[], rowType: string, key: string, isoDate: string): ReportRow[] {
  return rows.filter(row => row.row_type === rowType && normalizeDate(row.payload[key]) === isoDate)
}

function sumRows(rows: ReportRow[], ...keys: string[]): number {
  return rows.reduce((total, row) => total + keys.reduce((subtotal, key) => subtotal + toNumber(row.payload[key]), 0), 0)
}

export const ReportOverviewView: React.FC<ReportOverviewViewProps> = ({ report, theme, onImported, selectedDate }) => {
  const [data, setData] = useState<CanonicalReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isDark = theme === 'dark'
  const reportDate = selectedDate || report.report_date || todayIso()

  const sourceRows = useMemo(() => {
    const statistics = report.rows.filter(row => row.row_type === 'statistics')
    const cnch = report.rows.filter(row => row.row_type === 'cnch_event')
    const sclq = report.rows.filter(row => row.row_type === 'sclq')
    const dayStatistics = statistics.filter(row => isStatisticsRowForDate(row, reportDate))
    const dayCnch = rowsForDate(cnch, 'cnch_event', 'ngay_xay_ra', reportDate)
    const daySclq = rowsForDate(sclq, 'sclq', 'vu_chay_ngay', reportDate)

    const dailyMetrics = {
      fire: sumRows(dayStatistics, 'vu_chay_thong_ke'),
      sclq: sumRows(dayStatistics, 'sclq_den_pccc_cnch'),
      cnch: sumRows(dayStatistics, 'cnch'),
      inspection: sumRows(dayStatistics, 'dinh_ky_nhom_i', 'dinh_ky_nhom_ii', 'dot_xuat_nhom_i', 'dot_xuat_nhom_ii'),
      fineCases: sumRows(dayStatistics, 'xu_phat'),
      fineMoney: sumRows(dayStatistics, 'tien_phat_trieu_dong'),
      trainingPeople: sumRows(dayStatistics, 'so_nguoi_tham_du_huan_luyen') || sumRows(dayStatistics, 'tong_so_nguoi_tham_du')
    }

    return {
      statistics,
      cnch,
      sclq,
      dayStatistics,
      dayCnch,
      daySclq,
      dailyMetrics
    }
  }, [report.rows, reportDate])

  const loadOverview = async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await reportApi.aggregateReportJson(report.id, reportDate, reportDate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được tổng quan báo cáo ngày')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [report.id, reportDate, report.version])

  const kpis = useMemo(() => [
    { label: 'Vụ cháy', value: statValue(data, '2'), sourceValue: sourceRows.dailyMetrics.fire },
    { label: 'Tai nạn / sự cố', value: statValue(data, '14'), sourceValue: sourceRows.dailyMetrics.cnch + sourceRows.dailyMetrics.sclq },
    { label: 'CNCH chi tiết', value: data?.danh_sach_cnch.length || 0, sourceValue: sourceRows.dailyMetrics.cnch },
    { label: 'SCLQ chi tiết', value: data?.danh_sach_sclq?.length || 0, sourceValue: sourceRows.dailyMetrics.sclq },
    { label: 'Kiểm tra PCCC', value: statValue(data, '31'), sourceValue: sourceRows.dailyMetrics.inspection },
    { label: 'Xử phạt', value: statValue(data, '35'), sourceValue: sourceRows.dailyMetrics.fineCases },
    { label: 'Huấn luyện', value: statValue(data, '55'), sourceValue: sourceRows.dailyMetrics.trainingPeople }
  ], [data, sourceRows])

  const issues = useMemo(() => {
    const result: Array<{ level: 'ok' | 'warn' | 'error'; text: string }> = []
    const hasAnyRows = sourceRows.statistics.length + sourceRows.cnch.length + sourceRows.sclq.length > 0
    const hasDayNumbers = Object.values(sourceRows.dailyMetrics).some(value => value > 0)
    const hasDayDetails = sourceRows.dayCnch.length + sourceRows.daySclq.length > 0

    if (!hasAnyRows) {
      result.push({ level: 'error', text: 'Report này chưa có dữ liệu nguồn từ 3 bảng.' })
    } else if (sourceRows.dayStatistics.length === 0) {
      result.push({ level: 'error', text: `BC NGÀY chưa có dòng cho ngày ${formatViDate(reportDate)}.` })
    } else if (!hasDayNumbers && !hasDayDetails) {
      result.push({ level: 'warn', text: `Ngày ${formatViDate(reportDate)} có dòng trong BC NGÀY nhưng số liệu đang trống/0.` })
    }

    if (sourceRows.dailyMetrics.cnch !== sourceRows.dayCnch.length) {
      result.push({
        level: 'warn',
        text: `CNCH lệch: BC NGÀY ghi ${sourceRows.dailyMetrics.cnch}, bảng CNCH có ${sourceRows.dayCnch.length} dòng cùng ngày.`
      })
    }

    if (sourceRows.dailyMetrics.sclq !== sourceRows.daySclq.length) {
      result.push({
        level: 'warn',
        text: `SCLQ lệch: BC NGÀY ghi ${sourceRows.dailyMetrics.sclq}, bảng SCLQ có ${sourceRows.daySclq.length} dòng cùng ngày.`
      })
    }

    if (result.length === 0) {
      result.push({ level: 'ok', text: 'Ba bảng nguồn đang khớp với báo cáo ngày.' })
    }

    return result
  }, [reportDate, sourceRows])

  const palette: Palette = {
    panel: isDark ? '#111827' : '#ffffff',
    subpanel: isDark ? '#0f172a' : '#f8fafc',
    border: isDark ? '#334155' : '#d8dee6',
    text: isDark ? '#e5e7eb' : '#111827',
    muted: isDark ? '#94a3b8' : '#667085'
  }

  return (
    <section style={{ display: 'grid', gap: '16px', color: palette.text }}>
      <div style={{ background: palette.panel, border: `1px solid ${palette.border}`, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '18px' }}>Tổng quan báo cáo ngày</h2>
            <div style={{ color: palette.muted, fontSize: '13px' }}>
              Đang mở id {report.id} · ngày {formatViDate(reportDate)} · version {report.version}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(100px, 1fr))', gap: '8px', minWidth: 360 }}>
            <MiniSource label="BC NGÀY" total={sourceRows.statistics.length} matched={sourceRows.dayStatistics.length} palette={palette} />
            <MiniSource label="CNCH" total={sourceRows.cnch.length} matched={sourceRows.dayCnch.length} palette={palette} />
            <MiniSource label="SCLQ" total={sourceRows.sclq.length} matched={sourceRows.daySclq.length} palette={palette} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))', gap: '10px' }}>
        {kpis.map(kpi => (
          <div key={kpi.label} style={{ background: palette.panel, border: `1px solid ${palette.border}`, padding: '14px' }}>
            <div style={{ color: palette.muted, fontSize: '12px', fontWeight: 700 }}>{kpi.label}</div>
            <div style={{ marginTop: '8px', fontSize: '28px', fontWeight: 800 }}>{kpi.value}</div>
            <div style={{ marginTop: '4px', color: palette.muted, fontSize: '12px' }}>
              BC NGÀY: {kpi.sourceValue}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1fr) minmax(380px, 1.1fr)', gap: '16px' }}>
        <div style={{ background: palette.panel, border: `1px solid ${palette.border}`, padding: '16px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Đối chiếu nghiệp vụ</h2>
          {error && (
            <div style={{ padding: '10px 12px', background: '#f8d7da', color: '#842029', marginBottom: '12px' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gap: '8px' }}>
            {issues.map((item, index) => (
              <div key={`${item.level}-${index}`} style={{ padding: '10px 12px', background: statusBg(item.level), color: statusColor(item.level), fontSize: '13px', fontWeight: 700 }}>
                {item.text}
              </div>
            ))}
          </div>
          {loading && <div style={{ marginTop: '12px', color: palette.muted }}>Đang tải tổng quan...</div>}
        </div>

        <div style={{ background: palette.panel, border: `1px solid ${palette.border}`, padding: '16px' }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px' }}>Luồng dữ liệu</h2>
          <WorkflowStep index="1" title="Import Excel nguồn" text="Đưa dữ liệu vào đúng report id đang mở." palette={palette} />
          <WorkflowStep index="2" title="Kiểm tra 3 bảng" text="BC NGÀY là số tổng; CNCH và SCLQ là danh sách chi tiết theo ngày." palette={palette} />
          <WorkflowStep index="3" title="Báo cáo ngày" text="JSON và Word phải xuất từ ngày/report id đang chọn." palette={palette} />
        </div>
      </div>

      <ImportPanel
        reportId={report.id}
        theme={theme}
        onImportComplete={() => {
          loadOverview()
          onImported()
        }}
      />
    </section>
  )
}

function MiniSource({ label, total, matched, palette }: { label: string; total: number; matched: number; palette: Palette }) {
  return (
    <div style={{ background: palette.subpanel, border: `1px solid ${palette.border}`, padding: '10px' }}>
      <div style={{ color: palette.muted, fontSize: '12px', fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: '18px', fontWeight: 800 }}>{matched}</div>
      <div style={{ color: palette.muted, fontSize: '12px' }}>trên {total} dòng nguồn</div>
    </div>
  )
}

function WorkflowStep({ index, title, text, palette }: { index: string; title: string; text: string; palette: Palette }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: '10px', padding: '10px 0', borderBottom: `1px solid ${palette.border}` }}>
      <div style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', background: '#0d6efd', color: '#ffffff', fontWeight: 800 }}>
        {index}
      </div>
      <div>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <div style={{ marginTop: 3, color: palette.muted, fontSize: '13px' }}>{text}</div>
      </div>
    </div>
  )
}

function statusBg(level: 'ok' | 'warn' | 'error'): string {
  if (level === 'ok') return '#d1e7dd'
  if (level === 'warn') return '#fff3cd'
  return '#f8d7da'
}

function statusColor(level: 'ok' | 'warn' | 'error'): string {
  if (level === 'ok') return '#0f5132'
  if (level === 'warn') return '#664d03'
  return '#842029'
}

export default ReportOverviewView
