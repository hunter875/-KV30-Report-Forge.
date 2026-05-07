import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { reportApi } from '@/features/report/api'
import { CanonicalReport, DateRange, ThemeMode } from '@/types/report'
import { ExportWordPrompt } from './ExportWordPrompt'
import { ReportSupplementModal } from './ReportSupplementModal'

type AggregateMode = 'week' | 'month'

interface AggregateJsonViewProps {
  reportId: string
  mode: AggregateMode
  dateRange: DateRange
  theme: ThemeMode
  onDateRangeChange: (range: DateRange) => void
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultRange(mode: AggregateMode, anchorIso: string) {
  const anchor = new Date(`${anchorIso}T00:00:00`)
  if (mode === 'month') {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) }
  }

  const start = new Date(anchor)
  const mondayOffset = (anchor.getDay() + 6) % 7
  start.setDate(anchor.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) }
}

function formatRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).toLocaleDateString('vi-VN')
  const end = new Date(`${endDate}T00:00:00`).toLocaleDateString('vi-VN')
  return `${start} - ${end}`
}

export const AggregateJsonView: React.FC<AggregateJsonViewProps> = ({
  reportId,
  mode,
  dateRange,
  theme,
  onDateRangeChange
}) => {
  const startDate = dateRange.startDate
  const endDate = dateRange.endDate
  const [jsonText, setJsonText] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  const [hasSavedOverride, setHasSavedOverride] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [supplementOpen, setSupplementOpen] = useState(false)
  const [exportPromptOpen, setExportPromptOpen] = useState(false)
  const [exportAfterSupplement, setExportAfterSupplement] = useState(false)
  const isDark = theme === 'dark'

  const parsed = useMemo(() => {
    if (!jsonText.trim()) {
      return { ok: false, data: null as CanonicalReport | null, error: 'JSON rỗng' }
    }
    try {
      return { ok: true, data: JSON.parse(jsonText) as CanonicalReport, error: null }
    } catch (err) {
      return {
        ok: false,
        data: null,
        error: err instanceof Error ? err.message : 'JSON không hợp lệ'
      }
    }
  }, [jsonText])

  const rangeError = startDate && endDate && endDate < startDate
    ? 'Khoảng ngày không hợp lệ: ngày kết thúc phải sau hoặc bằng ngày bắt đầu.'
    : null

  const loadSourceJson = useCallback(async () => {
    if (!startDate || !endDate || endDate < startDate) return

    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      const data = await reportApi.aggregateReportJson(reportId, startDate, endDate)
      setJsonText(JSON.stringify(data, null, 2))
      setHasSavedOverride(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được JSON tổng hợp')
    } finally {
      setLoading(false)
    }
  }, [reportId, startDate, endDate])

  const reloadJson = useCallback(async () => {
    if (!startDate || !endDate || endDate < startDate) return

    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      const override = await reportApi.getOverride(reportId, 'weekly_report', startDate, endDate)
      if (override.exists && override.data) {
        setJsonText(JSON.stringify(override.data, null, 2))
        setHasSavedOverride(true)
        setMessage('Đang xem bản JSON đã lưu chỉnh sửa cho khoảng ngày này.')
        return
      }
      const data = await reportApi.aggregateReportJson(reportId, startDate, endDate)
      setJsonText(JSON.stringify(data, null, 2))
      setHasSavedOverride(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được JSON tổng hợp')
    } finally {
      setLoading(false)
    }
  }, [reportId, startDate, endDate])

  useEffect(() => {
    reloadJson()
  }, [reloadJson])

  const resetToDefaultRange = () => {
    const anchor = startDate || toIsoDate(new Date())
    onDateRangeChange(getDefaultRange(mode, anchor))
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
      setCopyStatus('Đã copy')
      setTimeout(() => setCopyStatus(null), 1400)
    } catch {
      setCopyStatus('Không copy được')
      setTimeout(() => setCopyStatus(null), 1800)
    }
  }

  const downloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kv30_${mode}_${startDate}_${endDate}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const performExportWord = async (dataOverride?: CanonicalReport) => {
    const data = dataOverride || parsed.data
    if (!parsed.ok || !data || rangeError) return
    try {
      setExporting(true)
      setError(null)
      const blob = await reportApi.renderDocxFromJson(reportId, data, 'bc_tuan_kv30.docx')
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kv30_${mode}_${startDate}_${endDate}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xuất được Word tổng hợp')
    } finally {
      setExporting(false)
    }
  }

  const requestExportWord = () => {
    if (!parsed.ok || !parsed.data || rangeError) return
    setExportPromptOpen(true)
  }

  const saveOverride = async () => {
    if (!parsed.ok || !parsed.data || rangeError) return
    try {
      setSavingOverride(true)
      setError(null)
      const result = await reportApi.saveOverride(reportId, 'weekly_report', startDate, endDate, parsed.data)
      setHasSavedOverride(Boolean(result.exists))
      setMessage('Đã lưu JSON chỉnh sửa cho khoảng ngày này. Dữ liệu nguồn không bị thay đổi.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được JSON chỉnh sửa')
    } finally {
      setSavingOverride(false)
    }
  }

  const applySupplement = (updated: CanonicalReport) => {
    setJsonText(JSON.stringify(updated, null, 2))
    setMessage(
      exportAfterSupplement
        ? 'Đã áp dụng dữ liệu bổ sung và bắt đầu xuất Word.'
        : 'Đã áp dụng dữ liệu bổ sung vào JSON hiện tại. Bấm lưu JSON khoảng ngày nếu muốn giữ lại lần sau.'
    )
    setSupplementOpen(false)
    if (exportAfterSupplement) {
      setExportAfterSupplement(false)
      performExportWord(updated)
    }
  }

  const closeSupplement = () => {
    setSupplementOpen(false)
    setExportAfterSupplement(false)
  }

  const discardOverride = async () => {
    try {
      setSavingOverride(true)
      setError(null)
      await reportApi.deleteOverride(reportId, 'weekly_report', startDate, endDate)
      await loadSourceJson()
      setMessage('Đã bỏ bản JSON chỉnh sửa, quay lại dữ liệu từ 3 bảng nguồn.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không bỏ được JSON chỉnh sửa')
    } finally {
      setSavingOverride(false)
    }
  }

  const palette = {
    text: isDark ? '#e5e7eb' : '#111827',
    muted: isDark ? '#94a3b8' : '#667085',
    border: isDark ? '#334155' : '#d0d5dd',
    input: isDark ? '#0f172a' : '#fbfbfc',
    panel: isDark ? '#111827' : '#ffffff'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: palette.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {mode === 'week' ? 'Tổng hợp tuần' : 'Tổng hợp tháng'}
          </h2>
          <div style={{ marginTop: '4px', color: palette.muted, fontSize: '13px' }}>
            Khoảng dữ liệu: {formatRange(startDate, endDate)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <label style={dateLabelStyle}>
            Từ ngày
            <input
              type="date"
              value={startDate}
              onChange={event => onDateRangeChange({ startDate: event.target.value, endDate })}
              style={dateInputStyle(palette.panel, palette.text, palette.border)}
            />
          </label>
          <label style={dateLabelStyle}>
            Đến ngày
            <input
              type="date"
              value={endDate}
              onChange={event => onDateRangeChange({ startDate, endDate: event.target.value })}
              style={dateInputStyle(palette.panel, palette.text, palette.border)}
            />
          </label>
          <button onClick={resetToDefaultRange} style={buttonStyle('#475569')}>
            {mode === 'week' ? 'Tuần của báo cáo' : 'Tháng của báo cáo'}
          </button>
          <span
            style={{
              padding: '5px 10px',
              background: parsed.ok && !rangeError ? '#d1e7dd' : '#f8d7da',
              color: parsed.ok && !rangeError ? '#0f5132' : '#842029',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            {parsed.ok && !rangeError ? 'Valid JSON' : 'Invalid JSON'}
          </span>
          <button onClick={loadSourceJson} disabled={loading || Boolean(rangeError)} style={buttonStyle('#6c757d')}>
            {loading ? 'Loading...' : 'Đồng bộ từ 3 bảng'}
          </button>
          <button
            onClick={() => {
              setExportAfterSupplement(false)
              setSupplementOpen(true)
            }}
            disabled={!parsed.ok || !parsed.data || Boolean(rangeError)}
            style={buttonStyle(!parsed.ok || !parsed.data || rangeError ? '#6c757d' : '#0f766e')}
          >
            Bổ sung dữ liệu
          </button>
          <button
            onClick={saveOverride}
            disabled={!parsed.ok || savingOverride || Boolean(rangeError)}
            style={buttonStyle(!parsed.ok || savingOverride || rangeError ? '#6c757d' : '#7c3aed')}
          >
            {savingOverride ? 'Đang lưu...' : 'Lưu JSON tuần'}
          </button>
          {hasSavedOverride && (
            <button onClick={discardOverride} disabled={savingOverride} style={buttonStyle('#b42318')}>
              Bỏ bản đã lưu
            </button>
          )}
          <button onClick={copyJson} style={buttonStyle('#495057')}>
            {copyStatus || 'Copy'}
          </button>
          <button onClick={downloadJson} disabled={!jsonText.trim()} style={buttonStyle('#198754')}>
            Download JSON
          </button>
          <button
            onClick={requestExportWord}
            disabled={!parsed.ok || exporting || Boolean(rangeError)}
            style={buttonStyle(!parsed.ok || exporting || rangeError ? '#6c757d' : '#0d6efd')}
          >
            {exporting ? 'Exporting...' : 'Export Word'}
          </button>
        </div>
      </div>

      {rangeError && (
        <div style={{ padding: '10px 12px', background: '#fff3cd', color: '#664d03', fontSize: '13px' }}>
          {rangeError}
        </div>
      )}
      {!parsed.ok && !rangeError && (
        <div style={{ padding: '10px 12px', background: '#fff3cd', color: '#664d03', fontSize: '13px' }}>
          {parsed.error}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 12px', background: '#f8d7da', color: '#842029', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ padding: '10px 12px', background: '#d1e7dd', color: '#0f5132', fontSize: '13px', fontWeight: 700 }}>
          {message}
        </div>
      )}

      <textarea
        value={jsonText}
        onChange={event => setJsonText(event.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: '680px',
          resize: 'vertical',
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '13px',
          lineHeight: 1.45,
          padding: '14px',
          color: palette.text,
          background: palette.input,
          border: `1px solid ${palette.border}`,
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />

      {parsed.ok && parsed.data && !rangeError && (
        <ReportSupplementModal
          open={supplementOpen}
          data={parsed.data}
          theme={theme}
          onClose={closeSupplement}
          onApply={applySupplement}
        />
      )}

      <ExportWordPrompt
        open={exportPromptOpen}
        theme={theme}
        title={`${mode === 'week' ? 'Báo cáo tuần' : 'Báo cáo tháng'} ${formatRange(startDate, endDate)}`}
        description="Có thể bổ sung các số liệu chưa có trong 3 bảng nguồn, chỉnh CNCH/SCLQ trong khoảng ngày này, rồi xuất Word bằng JSON vừa chỉnh. Nếu dữ liệu đã ổn thì xuất luôn."
        exporting={exporting}
        onClose={() => setExportPromptOpen(false)}
        onExportNow={() => {
          setExportPromptOpen(false)
          performExportWord()
        }}
        onSupplement={() => {
          setExportPromptOpen(false)
          setExportAfterSupplement(true)
          setSupplementOpen(true)
        }}
      />
    </div>
  )
}

const dateLabelStyle: React.CSSProperties = {
  display: 'grid',
  gap: '4px',
  fontSize: '12px',
  fontWeight: 700
}

function dateInputStyle(background: string, color: string, border: string): React.CSSProperties {
  return {
    padding: '8px 10px',
    border: `1px solid ${border}`,
    background,
    color
  }
}

function buttonStyle(background: string): React.CSSProperties {
  return {
    padding: '8px 12px',
    border: 'none',
    background,
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600
  }
}

export default AggregateJsonView
