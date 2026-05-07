import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { reportApi } from '@/features/report/api'
import { CanonicalReport, DateRange, ThemeMode } from '@/types/report'
import { ExportWordPrompt } from './ExportWordPrompt'
import { JsonTreeView } from './JsonTreeView'
import { ReportSupplementModal } from './ReportSupplementModal'

interface DataJsonViewProps {
  reportId: string
  dateRange: DateRange
  version?: number
  theme: ThemeMode
  onDateRangeChange?: (range: DateRange) => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatViDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('vi-VN')
}

export const DataJsonView: React.FC<DataJsonViewProps> = ({
  reportId,
  dateRange,
  version,
  theme,
  onDateRangeChange
}) => {
  const selectedDate = dateRange.startDate || todayIso()
  const [jsonText, setJsonText] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  const [hasSavedOverride, setHasSavedOverride] = useState(false)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'tree' | 'text'>('tree')
  const [supplementOpen, setSupplementOpen] = useState(false)
  const [exportPromptOpen, setExportPromptOpen] = useState(false)
  const [exportAfterSupplement, setExportAfterSupplement] = useState(false)
  const isDark = theme === 'dark'

  const parsed = useMemo(() => {
    if (!jsonText.trim()) {
      return { ok: false, data: null as CanonicalReport | null, error: 'JSON rỗng' }
    }
    try {
      return {
        ok: true,
        data: JSON.parse(jsonText) as CanonicalReport,
        error: null
      }
    } catch (err) {
      return {
        ok: false,
        data: null,
        error: err instanceof Error ? err.message : 'JSON không hợp lệ'
      }
    }
  }, [jsonText])

  const loadSourceJson = useCallback(async () => {
    if (!reportId || !selectedDate) return
    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      const data = await reportApi.aggregateReportJson(reportId, selectedDate, selectedDate)
      setJsonText(JSON.stringify(data, null, 2))
      setHasSavedOverride(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được báo cáo ngày')
    } finally {
      setLoading(false)
    }
  }, [reportId, selectedDate])

  const reloadJson = useCallback(async () => {
    if (!reportId || !selectedDate) return
    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      const override = await reportApi.getOverride(reportId, 'daily_report', selectedDate, selectedDate)
      if (override.exists && override.data) {
        setJsonText(JSON.stringify(override.data, null, 2))
        setHasSavedOverride(true)
        setMessage('Đang xem bản JSON đã lưu chỉnh sửa cho ngày này.')
        return
      }
      const data = await reportApi.aggregateReportJson(reportId, selectedDate, selectedDate)
      setJsonText(JSON.stringify(data, null, 2))
      setHasSavedOverride(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được báo cáo ngày')
    } finally {
      setLoading(false)
    }
  }, [reportId, selectedDate])

  useEffect(() => {
    reloadJson()
  }, [reloadJson, version])

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
    a.download = `bao_cao_ngay_${selectedDate}.json`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const performExportWord = async (dataOverride?: CanonicalReport) => {
    const data = dataOverride || parsed.data
    if (!parsed.ok || !data) return
    try {
      setExporting(true)
      setError(null)
      const blob = await reportApi.renderDocxFromJson(reportId, data)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bao_cao_ngay_${selectedDate}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xuất được Word báo cáo ngày')
    } finally {
      setExporting(false)
    }
  }

  const requestExportWord = () => {
    if (!parsed.ok || !parsed.data) return
    setExportPromptOpen(true)
  }

  const saveOverride = async () => {
    if (!parsed.ok || !parsed.data) return
    try {
      setSavingOverride(true)
      setError(null)
      const result = await reportApi.saveOverride(reportId, 'daily_report', selectedDate, selectedDate, parsed.data)
      setHasSavedOverride(Boolean(result.exists))
      setMessage('Đã lưu JSON chỉnh sửa cho ngày này. Dữ liệu nguồn không bị thay đổi.')
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
        : 'Đã áp dụng dữ liệu bổ sung vào JSON hiện tại. Bấm Lưu JSON ngày nếu muốn giữ lại lần sau.'
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
      await reportApi.deleteOverride(reportId, 'daily_report', selectedDate, selectedDate)
      await loadSourceJson()
      setMessage('Đã bỏ bản JSON chỉnh sửa, quay lại dữ liệu từ 3 bảng nguồn.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không bỏ được JSON chỉnh sửa')
    } finally {
      setSavingOverride(false)
    }
  }

  const handleSelectedDateChange = (date: string) => {
    onDateRangeChange?.({ startDate: date, endDate: date })
  }

  const palette = {
    text: isDark ? '#e5e7eb' : '#111827',
    muted: isDark ? '#94a3b8' : '#667085',
    input: isDark ? '#0f172a' : '#fbfbfc',
    border: isDark ? '#334155' : '#d0d5dd',
    panel: isDark ? '#111827' : '#ffffff'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: palette.text }}>Báo cáo ngày</h2>
          <div style={{ marginTop: '4px', fontSize: '13px', color: palette.muted }}>
            Dữ liệu được tổng hợp trực tiếp từ 3 bảng: BC NGÀY, CNCH và SCLQ theo ngày đang chọn.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 4, color: palette.text, fontSize: 12, fontWeight: 700 }}>
            Ngày xuất báo cáo
            <input
              type="date"
              value={selectedDate}
              onChange={event => handleSelectedDateChange(event.target.value)}
              style={{
                padding: '8px 10px',
                border: `1px solid ${palette.border}`,
                background: palette.panel,
                color: palette.text,
                fontWeight: 700
              }}
            />
          </label>
          <span
            style={{
              padding: '5px 10px',
              background: parsed.ok ? '#d1e7dd' : '#f8d7da',
              color: parsed.ok ? '#0f5132' : '#842029',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            {parsed.ok ? 'Sẵn sàng xuất' : 'JSON lỗi'}
          </span>
          <button onClick={() => setViewMode(viewMode === 'tree' ? 'text' : 'tree')} style={buttonStyle('#6c757d')}>
            {viewMode === 'tree' ? 'Xem dạng text' : 'Xem dạng cây'}
          </button>
          <button onClick={loadSourceJson} disabled={loading} style={buttonStyle('#6c757d')}>
            {loading ? 'Đang tải...' : 'Đồng bộ từ 3 bảng'}
          </button>
          <button
            onClick={() => {
              setExportAfterSupplement(false)
              setSupplementOpen(true)
            }}
            disabled={!parsed.ok || !parsed.data}
            style={buttonStyle(!parsed.ok || !parsed.data ? '#6c757d' : '#0f766e')}
          >
            Bổ sung dữ liệu
          </button>
          <button
            onClick={saveOverride}
            disabled={!parsed.ok || savingOverride}
            style={buttonStyle(!parsed.ok || savingOverride ? '#6c757d' : '#7c3aed')}
          >
            {savingOverride ? 'Đang lưu...' : 'Lưu JSON ngày'}
          </button>
          {hasSavedOverride && (
            <button onClick={discardOverride} disabled={savingOverride} style={buttonStyle('#b42318')}>
              Bỏ bản đã lưu
            </button>
          )}
          <button onClick={copyJson} style={buttonStyle('#495057')}>
            {copyStatus || 'Copy JSON'}
          </button>
          <button onClick={downloadJson} disabled={!jsonText.trim()} style={buttonStyle('#198754')}>
            Tải JSON
          </button>
          <button
            onClick={requestExportWord}
            disabled={!parsed.ok || exporting}
            style={buttonStyle(!parsed.ok || exporting ? '#6c757d' : '#0d6efd')}
          >
            {exporting ? 'Đang xuất...' : `Xuất Word ngày ${formatViDate(selectedDate)}`}
          </button>
        </div>
      </div>

      {!parsed.ok && (
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

      {viewMode === 'tree' ? (
        parsed.ok && parsed.data ? (
          <JsonTreeView data={parsed.data} theme={theme} />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: palette.muted }}>
            Không có dữ liệu hợp lệ để hiển thị
          </div>
        )
      ) : (
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
      )}

      {parsed.ok && parsed.data && (
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
        title={`Báo cáo ngày ${formatViDate(selectedDate)}`}
        description="Có thể bổ sung các số liệu chưa có trong 3 bảng nguồn, chỉnh CNCH/SCLQ, rồi xuất Word bằng JSON vừa chỉnh. Nếu dữ liệu đã ổn thì xuất luôn."
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

export default DataJsonView
