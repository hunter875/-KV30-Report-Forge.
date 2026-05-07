import React from 'react'
import { SaveStatus, ThemeMode } from '@/types/report'

interface SaveStatusBadgeProps {
  status: SaveStatus
  className?: string
  lastSavedTime?: Date | null
  theme?: ThemeMode
}

const STATUS_CONFIG = {
  idle: {
    label: '● All changes saved',
    variant: 'success' as const
  },
  saving: {
    label: '● Saving...',
    variant: 'warning' as const
  },
  saved: {
    label: '✓ Saved',
    variant: 'success' as const
  },
  conflict: {
    label: '⚠ Conflict — Reloaded',
    variant: 'error' as const
  },
  error: {
    label: '✗ Error',
    variant: 'error' as const
  }
}

export const SaveStatusBadge: React.FC<SaveStatusBadgeProps> = ({
  status,
  className = '',
  lastSavedTime,
  theme = 'light'
}) => {
  const isDark = theme === 'dark'
  const config = STATUS_CONFIG[status]

  const getColors = () => {
    switch (config.variant) {
      case 'success':
        return { bg: isDark ? '#14532d' : '#d4edda', text: isDark ? '#86efac' : '#155724' }
      case 'warning':
        return { bg: isDark ? '#854d0e' : '#fff3cd', text: isDark ? '#fde047' : '#856404' }
      case 'error':
        return { bg: isDark ? '#7f1d1d' : '#f8d7da', text: isDark ? '#fca5a5' : '#721c24' }
      default:
        return { bg: isDark ? '#1f2937' : '#e9ecef', text: isDark ? '#d1d5db' : '#495057' }
    }
  }

  const { bg, text } = getColors()

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: bg,
        color: text,
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500
      }}
      title={lastSavedTime ? `Lưu lúc ${formatTime(lastSavedTime)}` : undefined}
    >
      {config.label}
      {status === 'saved' && lastSavedTime && (
        <span style={{ fontSize: '10px', opacity: 0.7 }}>
          {formatTime(lastSavedTime)}
        </span>
      )}
    </span>
  )
}

export default SaveStatusBadge
