import React from 'react'
import { ThemeMode } from '@/types/report'

interface ExportWordPromptProps {
  open: boolean
  theme: ThemeMode
  title: string
  description: string
  exporting?: boolean
  onSupplement: () => void
  onExportNow: () => void
  onClose: () => void
}

export const ExportWordPrompt: React.FC<ExportWordPromptProps> = ({
  open,
  theme,
  title,
  description,
  exporting = false,
  onSupplement,
  onExportNow,
  onClose
}) => {
  if (!open) return null

  const isDark = theme === 'dark'
  const palette = {
    modal: isDark ? '#0f172a' : '#ffffff',
    panel: isDark ? '#111827' : '#f8fafc',
    border: isDark ? '#334155' : '#d0d5dd',
    text: isDark ? '#e5e7eb' : '#101828',
    muted: isDark ? '#94a3b8' : '#667085'
  }

  return (
    <div
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1250,
        background: 'rgba(15, 23, 42, 0.58)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        style={{
          width: 'min(520px, 94vw)',
          background: palette.modal,
          color: palette.text,
          border: `1px solid ${palette.border}`,
          boxShadow: '0 24px 72px rgba(2, 6, 23, 0.38)',
          padding: 20
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Trước khi xuất Word</h2>
        <div style={{ marginTop: 8, color: palette.muted, fontSize: 13, lineHeight: 1.5 }}>
          {title}
        </div>
        <div style={{ marginTop: 12, padding: 12, background: palette.panel, border: `1px solid ${palette.border}`, fontSize: 13, lineHeight: 1.5 }}>
          {description}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <button onClick={onClose} disabled={exporting} style={buttonStyle(palette.panel, palette.text, palette.border)}>
            Hủy
          </button>
          <button onClick={onExportNow} disabled={exporting} style={solidButtonStyle(exporting ? '#64748b' : '#475569')}>
            {exporting ? 'Đang xuất...' : 'Xuất luôn'}
          </button>
          <button onClick={onSupplement} disabled={exporting} style={solidButtonStyle('#0f766e')}>
            Bổ sung trước
          </button>
        </div>
      </div>
    </div>
  )
}

function buttonStyle(background: string, color: string, border: string): React.CSSProperties {
  return {
    padding: '9px 13px',
    border: `1px solid ${border}`,
    background,
    color,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700
  }
}

function solidButtonStyle(background: string): React.CSSProperties {
  return {
    padding: '9px 13px',
    border: 'none',
    background,
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 800
  }
}

export default ExportWordPrompt
