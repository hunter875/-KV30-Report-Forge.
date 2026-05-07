import React, { useState } from 'react'
import { DomainRowType, ImportPreview, ThemeMode } from '@/types/report'
import { reportApi } from '@/features/report/api'

interface ImportTarget {
  rowType: DomainRowType
  label: string
  hint: string
}

const IMPORT_TARGETS: ImportTarget[] = [
  { rowType: 'statistics', label: 'BC NGÀY', hint: 'Đọc sheet "BC NGÀY", lấy dữ liệu từ dòng 4, cột A:AH.' },
  { rowType: 'cnch_event', label: 'CNCH', hint: 'Đọc sheet "CNCH", lấy dữ liệu từ dòng 3, cột A:I.' },
  { rowType: 'sclq', label: 'SCLQ', hint: 'Đọc sheet "SCLQ ĐẾN PCCC&CNCH", lấy dữ liệu từ dòng 3, cột A:G.' }
]

interface ImportPanelProps {
  reportId: string
  theme: ThemeMode
  onImportComplete: () => void
}

export const ImportPanel: React.FC<ImportPanelProps> = ({ reportId, theme, onImportComplete }) => {
  const isDark = theme === 'dark'
  const [target, setTarget] = useState<DomainRowType>('statistics')
  const [replace, setReplace] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const palette = {
    panel: isDark ? '#111827' : '#ffffff',
    subpanel: isDark ? '#0f172a' : '#f8fafc',
    border: isDark ? '#334155' : '#d8dee6',
    text: isDark ? '#e5e7eb' : '#111827',
    muted: isDark ? '#94a3b8' : '#667085'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null)
    setError(null)
    setImportMessage(null)
    setPreview(null)
  }

  const previewFileOrPaste = async (source: 'file' | 'paste') => {
    try {
      setPreviewing(true)
      setError(null)
      setImportMessage(null)

      let result: ImportPreview
      if (source === 'file' && file) {
        result = await reportApi.previewImportRows(reportId, target, file)
      } else if (source === 'paste' && csvText.trim()) {
        const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
        const csvFile = new File([csvBlob], 'paste.csv', { type: 'text/csv' })
        result = await reportApi.previewImportRows(reportId, target, csvFile)
      } else {
        setError('Chọn file hoặc dán dữ liệu CSV trước đã.')
        return
      }

      setPreview(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview import thất bại')
    } finally {
      setPreviewing(false)
    }
  }

  const previewWorkbook = async () => {
    if (!file) return

    try {
      setPreviewing(true)
      setError(null)
      setImportMessage(null)
      setPreview(await reportApi.previewImportWorkbook(reportId, file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview workbook thất bại')
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async (source: 'file' | 'paste') => {
    try {
      setImporting(true)
      setError(null)
      setImportMessage(null)

      let result
      if (source === 'file' && file) {
        result = await reportApi.importRows(reportId, target, file, replace)
      } else if (source === 'paste' && csvText.trim()) {
        const csvBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
        const csvFile = new File([csvBlob], 'paste.csv', { type: 'text/csv' })
        result = await reportApi.importRows(reportId, target, csvFile, replace)
      } else {
        setError('Chọn file hoặc dán dữ liệu CSV trước đã.')
        return
      }

      setImportMessage(`Đã import ${result.imported} dòng vào ${IMPORT_TARGETS.find(item => item.rowType === target)?.label}.`)
      setFile(null)
      setCsvText('')
      setPreview(null)
      await onImportComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import Excel thất bại')
    } finally {
      setImporting(false)
    }
  }

  const handleImportWorkbook = async () => {
    if (!file) return

    try {
      setImporting(true)
      setError(null)
      setImportMessage(null)

      const result = await reportApi.importWorkbook(reportId, file, replace)
      const summary = IMPORT_TARGETS
        .map(item => `${item.label}: ${result.imported[item.rowType] || 0}`)
        .join(', ')
      setImportMessage(`Đã import 3 bảng: ${summary}.`)
      setFile(null)
      setCsvText('')
      setPreview(null)
      await onImportComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import workbook thất bại')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ background: palette.panel, border: `1px solid ${palette.border}`, padding: '16px' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>Import Excel / CSV</h2>
      <div style={{ color: palette.muted, fontSize: '13px', marginBottom: '14px' }}>
        File Excel gốc có header merge nhiều tầng nên app đọc theo sheet và tọa độ chuẩn, không đoán header.
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', alignItems: 'end' }}>
          <label style={labelStyle(isDark)}>
            Bảng đích
            <select
              value={target}
              onChange={event => setTarget(event.target.value as DomainRowType)}
              style={inputStyle(palette.panel, palette.text, palette.border)}
            >
              {IMPORT_TARGETS.map(item => (
                <option key={item.rowType} value={item.rowType}>{item.label}</option>
              ))}
            </select>
          </label>

          <div style={{ fontSize: '12px', color: palette.muted, paddingBottom: '8px' }}>
            {IMPORT_TARGETS.find(item => item.rowType === target)?.hint}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
          <label style={labelStyle(isDark)}>
            Upload file (.xlsx, .csv, .tsv)
            <input
              type="file"
              accept=".xlsx,.csv,.tsv"
              onChange={handleFileChange}
              style={inputStyle(palette.panel, palette.text, palette.border)}
            />
          </label>
          {file && (
            <div style={{ fontSize: '12px', color: '#198754' }}>
              Đã chọn: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
          <div style={{ flex: 1, height: '1px', background: palette.border }} />
          <span style={{ color: palette.muted, fontSize: '12px' }}>HOẶC</span>
          <div style={{ flex: 1, height: '1px', background: palette.border }} />
        </div>

        <div>
          <label style={labelStyle(isDark)}>
            Dán dữ liệu CSV
            <textarea
              value={csvText}
              onChange={event => setCsvText(event.target.value)}
              placeholder="Dán dữ liệu CSV/TSV nếu cần sửa nhanh..."
              style={{
                ...inputStyle(palette.panel, palette.text, palette.border),
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'Consolas, monospace',
                fontSize: '12px'
              }}
            />
          </label>
        </div>

        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={replace}
            onChange={event => setReplace(event.target.checked)}
          />
          <span style={{ color: palette.text }}>Ghi đè dữ liệu cũ của bảng này</span>
        </label>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={previewWorkbook}
            disabled={!file || previewing || importing}
            style={buttonStyle(!file || previewing || importing ? '#6c757d' : '#475569')}
          >
            {previewing ? 'Đang đọc...' : 'Preview 3 bảng'}
          </button>
          <button
            onClick={handleImportWorkbook}
            disabled={!file || importing || previewing}
            style={buttonStyle(!file || importing || previewing ? '#6c757d' : '#7c3aed')}
          >
            {importing ? 'Đang import...' : 'Import 3 bảng'}
          </button>
          <button
            onClick={() => previewFileOrPaste('file')}
            disabled={!file || previewing || importing}
            style={buttonStyle(!file || previewing || importing ? '#6c757d' : '#475569')}
          >
            {previewing ? 'Đang đọc...' : 'Preview file'}
          </button>
          <button
            onClick={() => handleImport('file')}
            disabled={!file || importing || previewing}
            style={buttonStyle(!file || importing || previewing ? '#6c757d' : '#0d6efd')}
          >
            {importing ? 'Đang import...' : 'Import từ file'}
          </button>
          <button
            onClick={() => previewFileOrPaste('paste')}
            disabled={!csvText.trim() || previewing || importing}
            style={buttonStyle(!csvText.trim() || previewing || importing ? '#6c757d' : '#475569')}
          >
            {previewing ? 'Đang đọc...' : 'Preview paste'}
          </button>
          <button
            onClick={() => handleImport('paste')}
            disabled={!csvText.trim() || importing || previewing}
            style={buttonStyle(!csvText.trim() || importing || previewing ? '#6c757d' : '#198754')}
          >
            {importing ? 'Đang import...' : 'Import từ paste'}
          </button>
        </div>

        {preview && <ImportPreviewSummary preview={preview} palette={palette} />}

        {importMessage && (
          <div style={{ padding: '10px 12px', background: '#d1e7dd', color: '#0f5132', fontSize: '13px' }}>
            {importMessage}
          </div>
        )}
        {error && (
          <div style={{ padding: '10px 12px', background: '#f8d7da', color: '#842029', fontSize: '13px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function ImportPreviewSummary({
  preview,
  palette
}: {
  preview: ImportPreview
  palette: { subpanel: string; border: string; text: string; muted: string }
}) {
  return (
    <div style={{ border: `1px solid ${palette.border}`, background: palette.subpanel, padding: '12px', display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <strong style={{ color: palette.text }}>Preview import</strong>
        <span style={{ color: preview.can_import ? '#0f5132' : '#842029', fontSize: 12, fontWeight: 800 }}>
          {preview.can_import ? 'Có thể import' : 'Cần kiểm tra lỗi'}
        </span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {preview.sheets.map(sheet => (
          <div key={`${sheet.row_type}-${sheet.sheet_name}`} style={{ border: `1px solid ${palette.border}`, padding: 10, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ color: palette.text }}>{sheet.label}</strong>
              <span style={{ color: palette.muted, fontSize: 12 }}>{sheet.sheet_name}</span>
            </div>
            <div style={{ marginTop: 6, color: palette.muted, fontSize: 12 }}>
              Map được {sheet.row_count} dòng từ {sheet.raw_rows} dòng nguồn
              {sheet.sample_dates.length ? ` · ngày mẫu: ${sheet.sample_dates.join(', ')}` : ''}
            </div>
            {[...sheet.errors, ...sheet.date_errors, ...sheet.warnings].slice(0, 8).map((item, index) => (
              <div key={`${sheet.row_type}-${index}`} style={{ marginTop: 6, color: sheet.errors.length || sheet.date_errors.length ? '#842029' : '#664d03', fontSize: 12, fontWeight: 700 }}>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function labelStyle(isDark: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gap: '5px',
    fontSize: '12px',
    fontWeight: 700,
    color: isDark ? '#e5e7eb' : '#212529'
  }
}

function inputStyle(background: string, color: string, border: string): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: `1px solid ${border}`,
    background,
    color,
    borderRadius: '4px',
    fontSize: '13px'
  }
}

function buttonStyle(background: string): React.CSSProperties {
  return {
    padding: '9px 13px',
    border: 'none',
    background,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    borderRadius: '4px'
  }
}

export default ImportPanel
