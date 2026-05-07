import React, { useState } from 'react'
import { SaveStatusBadge } from './SaveStatusBadge'
import { Report, ThemeMode } from '@/types/report'
import { reportApi } from '@/features/report/api'
import { ValidationModal } from './ValidationModal'
import { useTheme } from '@/theme'

interface ReportToolbarProps {
  report: Report
  reportId: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'conflict' | 'error'
  version: number
  theme: ThemeMode
  onToggleTheme: () => void
  onReload: () => void
  onExportWord?: () => void
  onPreviewWord?: () => void
  isExporting?: boolean
  isPreviewing?: boolean
  conflictMessage?: string | null
  reportDate?: string
  onReportDateChange?: (date: string) => void
  lastSavedTime?: Date | null
  showExportWord?: boolean
}

export const ReportToolbar: React.FC<ReportToolbarProps> = ({
  report,
  reportId,
  saveStatus,
  version,
  theme,
  onToggleTheme,
  onReload,
  onExportWord,
  onPreviewWord,
  isExporting = false,
  isPreviewing = false,
  conflictMessage,
  reportDate,
  onReportDateChange,
  lastSavedTime,
  showExportWord = false
}) => {
  const { isDark, colors } = useTheme(theme)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationMissing, setValidationMissing] = useState<string[]>([])
  const [validating, setValidating] = useState(false)

  const handlePreviewWord = async () => {
    if (isPreviewing) return
    try {
      // Preview doesn't need validation - just open the docx
      const blob = await reportApi.previewDocx(reportId)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Preview failed:', err)
      alert('Không thể xem trước Word. Vui lòng thử lại.')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('vi-VN')
  }

  const subtitle = report.report_date
    ? `Ngày báo cáo: ${formatDate(report.report_date)}`
    : 'Kho dữ liệu nguồn: BC NGÀY, CNCH, SCLQ. Báo cáo được lọc theo ngày hoặc khoảng ngày đang chọn.'

  const handleExportWordClick = async () => {
    if (!onExportWord || isExporting || validating) return

    try {
      setValidating(true)
      const result = await reportApi.validateExport(reportId)

      if (!result.valid) {
        setValidationMissing(result.missing)
        setShowValidationModal(true)
        return
      }

      // All good, proceed with export
      onExportWord()
    } catch (err) {
      console.error('Validation failed:', err)
      // If validation fails with error, still allow export
      onExportWord()
    } finally {
      setValidating(false)
    }
  }

  const handleExportAnyway = () => {
    if (!onExportWord) return
    setShowValidationModal(false)
    onExportWord()
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onReportDateChange) {
      onReportDateChange(e.target.value)
    }
  }

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0]
    if (onReportDateChange) {
      onReportDateChange(today)
    }
  }

  const handleSetYesterday = () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    if (onReportDateChange) {
      onReportDateChange(yesterday)
    }
  }

  return (
    <>
      <div
        style={{
          marginBottom: '20px',
          padding: '16px',
          background: colors.surface,
          borderRadius: '8px',
          border: `1px solid ${colors.border}`
        }}
      >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          marginBottom: conflictMessage || saveStatus === 'error' ? '12px' : 0
        }}
      >
        <div style={{ flex: '1 1 100%', minWidth: '280px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: colors.text }}>
            {report.title}
          </h1>
          <div style={{ marginTop: '4px', fontSize: '14px', color: colors.textMuted }}>
            {subtitle}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SaveStatusBadge status={saveStatus} lastSavedTime={lastSavedTime} theme={theme} />

          <div
            style={{
              padding: '4px 12px',
              background: colors.input,
              borderRadius: '4px',
              fontSize: '12px',
              color: colors.textSecondary
            }}
          >
            Version: {version}
          </div>

          <button onClick={onToggleTheme} style={buttonStyle(colors.secondary)}>
            {isDark ? 'Light mode' : 'Night mode'}
          </button>

          <button onClick={onReload} style={buttonStyle(colors.secondary)}>
            Reload
          </button>

          {showExportWord && onExportWord && (
            <button
              onClick={handleExportWordClick}
              disabled={isExporting || validating}
              style={{
                ...buttonStyle(isExporting || validating ? colors.secondary : colors.primary),
                cursor: isExporting || validating ? 'not-allowed' : 'pointer',
                opacity: isExporting || validating ? 0.7 : 1
              }}
            >
              {isExporting ? 'Exporting...' : validating ? 'Đang kiểm tra...' : 'Export Word'}
            </button>
          )}
          {onPreviewWord && (
            <button
              onClick={handlePreviewWord}
              disabled={isPreviewing}
              style={{
                ...buttonStyle(isPreviewing ? colors.secondary : colors.success),
                cursor: isPreviewing ? 'not-allowed' : 'pointer',
                opacity: isPreviewing ? 0.7 : 1
              }}
            >
              {isPreviewing ? 'Đang mở...' : 'Preview Word'}
            </button>
          )}
        </div>
      </div>

      {/* Working Date Bar */}
      {reportDate && onReportDateChange && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: colors.input,
            borderRadius: '6px',
            border: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text }}>
            Ngày đang làm việc:
          </span>
          <input
            type="date"
            value={reportDate}
            onChange={handleDateChange}
            style={{
              padding: '6px 10px',
              border: `1px solid ${colors.border}`,
              background: isDark ? '#111827' : '#ffffff',
              color: colors.text,
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'monospace'
            }}
          />
          <button
            onClick={handleSetToday}
            style={smallButtonStyle(colors.primary)}
          >
            Hôm nay
          </button>
          <button
            onClick={handleSetYesterday}
            style={smallButtonStyle(colors.secondary)}
          >
            Hôm qua
          </button>
        </div>
      )}

      {conflictMessage && saveStatus === 'conflict' && (
        <div style={{ padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', fontSize: '14px', color: '#856404' }}>
          {conflictMessage}
        </div>
      )}

      {saveStatus === 'error' && (
        <div style={{ padding: '12px 16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', fontSize: '14px', color: '#721c24' }}>
          Có lỗi xảy ra khi lưu. Vui lòng thử lại.
        </div>
      )}
    </div>

    <ValidationModal
      isOpen={showValidationModal}
      missingFields={validationMissing}
      theme={theme}
      onClose={() => setShowValidationModal(false)}
      onExportAnyway={handleExportAnyway}
    />
    </>
  )
}

function buttonStyle(background: string, textColor: string = 'white'): React.CSSProperties {
  return {
    padding: '8px 12px',
    background,
    color: textColor,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'opacity 0.15s ease'
  }
}

function smallButtonStyle(background: string): React.CSSProperties {
  return {
    padding: '5px 10px',
    background,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'opacity 0.15s ease'
  }
}

export default ReportToolbar
