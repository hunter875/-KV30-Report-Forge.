import React from 'react'
import { ThemeMode } from '@/types/report'

interface ValidationModalProps {
  isOpen: boolean
  missingFields: string[]
  theme: ThemeMode
  onClose: () => void
  onExportAnyway: () => void
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  missingFields,
  theme,
  onClose,
  onExportAnyway
}) => {
  if (!isOpen) return null

  const isDark = theme === 'dark'

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          background: isDark ? '#1f2937' : '#ffffff',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}
      >
        <h2 style={{ margin: '0 0 16px', color: isDark ? '#f59e0b' : '#dc3545', fontSize: '18px' }}>
          ⚠️ Cảnh báo: Dữ liệu chưa đầy đủ
        </h2>

        <p style={{ margin: '0 0 16px', color: isDark ? '#e5e7eb' : '#212529', fontSize: '14px' }}>
          Các trường sau đang thiếu hoặc chưa nhập:
        </p>

        <ul style={{
          margin: '0 0 20px',
          paddingLeft: '20px',
          color: isDark ? '#94a3b8' : '#6c757d',
          fontSize: '14px'
        }}>
          {missingFields.map((field, idx) => (
            <li key={idx} style={{ marginBottom: '6px' }}>{field}</li>
          ))}
        </ul>

        <p style={{ margin: '0 0 20px', color: isDark ? '#f59e0b' : '#856404', fontSize: '13px' }}>
          Bạn có thể xuất báo cáo với dữ liệu thiếu, nhưng các trường này sẽ không xuất hiện trong file Word.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onExportAnyway}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: '#dc3545',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            Xuất Anyway
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: `1px solid ${isDark ? '#475569' : '#ced4da'}`,
              borderRadius: '4px',
              background: isDark ? '#374151' : '#f8f9fa',
              color: isDark ? '#e5e7eb' : '#212529',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            Quay lại sửa
          </button>
        </div>
      </div>
    </div>
  )
}

export default ValidationModal
