import React, { useEffect, useMemo, useState } from 'react'
import { Report, ReportRow, ThemeMode } from '@/types/report'
import type { ReportView } from './ReportSidebar'

interface ReportCalendarViewProps {
  currentReportId: string
  currentReportDate?: string | null
  sourceReport?: Report | null
  theme: ThemeMode
  onDateSelected?: (reportDate: string, view: ReportView) => void
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
}

function formatViDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('vi-VN')
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(String(value).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  const text = String(value).trim()
  const vi = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (vi) {
    const [, day, month, year] = vi
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const [, year, month, day] = iso
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return null
}

function statisticsIso(row: ReportRow, year: number): string | null {
  if (row.row_type !== 'statistics') return null
  const day = toNumber(row.payload.ngay)
  const month = toNumber(row.payload.thang)
  if (!day || !month) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const ReportCalendarView: React.FC<ReportCalendarViewProps> = ({
  currentReportId,
  currentReportDate,
  sourceReport,
  theme,
  onDateSelected
}) => {
  const initialDate = currentReportDate || toIsoDate(new Date())
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(`${initialDate}T00:00:00`))
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!currentReportDate) return
    setSelectedDate(currentReportDate)
    setVisibleMonth(new Date(`${currentReportDate}T00:00:00`))
  }, [currentReportDate])

  const dataByDate = useMemo(() => {
    const map = new Map<string, { statistics: number; cnch: number; sclq: number }>()
    const year = visibleMonth.getFullYear()

    const ensure = (iso: string) => {
      const current = map.get(iso) || { statistics: 0, cnch: 0, sclq: 0 }
      map.set(iso, current)
      return current
    }

    for (const row of sourceReport?.rows || []) {
      if (row.row_type === 'statistics') {
        const iso = statisticsIso(row, year)
        if (iso) ensure(iso).statistics += 1
      } else if (row.row_type === 'cnch_event') {
        const iso = normalizeDate(row.payload.ngay_xay_ra)
        if (iso) ensure(iso).cnch += 1
      } else if (row.row_type === 'sclq') {
        const iso = normalizeDate(row.payload.vu_chay_ngay)
        if (iso) ensure(iso).sclq += 1
      }
    }

    return map
  }, [sourceReport?.rows, visibleMonth])

  const selectedSummary = dataByDate.get(selectedDate) || { statistics: 0, cnch: 0, sclq: 0 }
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const gridStart = new Date(firstDay)
  const offset = (firstDay.getDay() + 6) % 7
  gridStart.setDate(firstDay.getDate() - offset)

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })

  const palette = {
    panel: isDark ? '#111827' : '#ffffff',
    border: isDark ? '#334155' : '#d8dee6',
    text: isDark ? '#e5e7eb' : '#111827',
    muted: isDark ? '#94a3b8' : '#667085',
    cell: isDark ? '#0f172a' : '#f8fafc',
    active: isDark ? '#1d4ed8' : '#e7f1ff',
    activeText: isDark ? '#ffffff' : '#084298'
  }

  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) 340px', gap: '16px' }}>
      <div style={{ border: `1px solid ${palette.border}`, background: palette.panel, padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <button style={buttonStyle(isDark)} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>
            Tháng trước
          </button>
          <h2 style={{ margin: 0, color: palette.text, fontSize: '18px', textTransform: 'capitalize' }}>
            {monthLabel(visibleMonth)}
          </h2>
          <button style={buttonStyle(isDark)} onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>
            Tháng sau
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
            <div key={day} style={{ color: palette.muted, fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
              {day}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {days.map(day => {
            const iso = toIsoDate(day)
            const inMonth = day.getMonth() === visibleMonth.getMonth()
            const summary = dataByDate.get(iso)
            const hasData = Boolean(summary && (summary.statistics || summary.cnch || summary.sclq))
            const active = selectedDate === iso
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                style={{
                  minHeight: '78px',
                  padding: '8px',
                  border: `1px solid ${active ? '#0d6efd' : palette.border}`,
                  background: active ? palette.active : palette.cell,
                  color: active ? palette.activeText : palette.text,
                  opacity: inMonth ? 1 : 0.45,
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{day.getDate()}</div>
                {hasData && (
                  <div style={{ marginTop: '8px', fontSize: '11px', lineHeight: 1.35, color: active ? palette.activeText : '#198754', fontWeight: 700 }}>
                    BC {summary?.statistics || 0} · CNCH {summary?.cnch || 0} · SCLQ {summary?.sclq || 0}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <aside style={{ border: `1px solid ${palette.border}`, background: palette.panel, padding: '16px', color: palette.text }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '16px' }}>Ngày đang chọn</h3>
        <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
          {formatViDate(selectedDate)}
        </div>
        <div style={{ color: palette.muted, fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
          Dữ liệu đọc trực tiếp từ kho nguồn, không tạo thêm report ngày và không copy rows nữa.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          <MiniStat label="BC NGÀY" value={selectedSummary.statistics} />
          <MiniStat label="CNCH" value={selectedSummary.cnch} />
          <MiniStat label="SCLQ" value={selectedSummary.sclq} />
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <button onClick={() => onDateSelected?.(selectedDate, 'data_json')} style={primaryButtonStyle(false)}>
            Mở báo cáo ngày
          </button>
          <button onClick={() => onDateSelected?.(selectedDate, 'weekly_json')} style={buttonStyle(isDark)}>
            Mở báo cáo tuần
          </button>
          <button onClick={() => onDateSelected?.(selectedDate, 'bc_ngay')} style={buttonStyle(isDark)}>
            Quay về bảng nhập liệu
          </button>
          {currentReportId && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: palette.muted }}>
              Kho dữ liệu gốc: {currentReportId}
            </div>
          )}
        </div>
      </aside>
    </section>
  )
}

const miniStatStyle: React.CSSProperties = {
  border: '1px solid #d0d5dd',
  padding: '10px',
  display: 'grid',
  gap: 4
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={miniStatStyle}>
      <span style={{ fontSize: 11, color: '#667085', fontWeight: 700 }}>{label}</span>
      <strong style={{ fontSize: 18 }}>{value}</strong>
    </div>
  )
}

function buttonStyle(isDark: boolean): React.CSSProperties {
  return {
    border: `1px solid ${isDark ? '#475569' : '#d0d5dd'}`,
    background: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#e5e7eb' : '#344054',
    padding: '10px 12px',
    cursor: 'pointer',
    fontWeight: 600
  }
}

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: 0,
    background: disabled ? '#6c757d' : '#0d6efd',
    color: '#ffffff',
    padding: '10px 12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    opacity: disabled ? 0.7 : 1
  }
}

export default ReportCalendarView
