import React, { useEffect, useState } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
}

interface ToastContainerProps {
  theme: 'light' | 'dark'
}

let toastId = 0
const toasts: Toast[] = []
const listeners: ((toasts: Toast[]) => void)[] = []

export const ToastContainer: React.FC<ToastContainerProps> = ({ theme }) => {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const notify = () => setCurrentToasts([...toasts])
    listeners.push(notify)
    return () => {
      const index = listeners.indexOf(notify)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  const removeToast = (id: number) => {
    const index = toasts.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.splice(index, 1)
      listeners.forEach(l => l([...toasts]))
    }
  }

  if (currentToasts.length === 0) return null

  const isDark = theme === 'dark'
  const palette = {
    success: isDark ? '#10b981' : '#198754',
    warning: isDark ? '#f59e0b' : '#ffc107',
    error: isDark ? '#ef4444' : '#dc3545',
    info: isDark ? '#3b82f6' : '#0d6efd'
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '400px'
      }}
    >
      {currentToasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          style={{
            padding: '12px 16px',
            background: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${palette[toast.type]}`,
            borderLeft: `4px solid ${palette[toast.type]}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            color: isDark ? '#e5e7eb' : '#212529',
            fontSize: '13px',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export const toast = {
  success(message: string, duration = 3000) {
    const id = ++toastId
    toasts.push({ id, message, type: 'success', duration })
    listeners.forEach(l => l([...toasts]))
    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === id)
        if (index > -1) {
          toasts.splice(index, 1)
          listeners.forEach(l => l([...toasts]))
        }
      }, duration)
    }
  },
  warning(message: string, duration = 4000) {
    const id = ++toastId
    toasts.push({ id, message, type: 'warning', duration })
    listeners.forEach(l => l([...toasts]))
    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === id)
        if (index > -1) {
          toasts.splice(index, 1)
          listeners.forEach(l => l([...toasts]))
        }
      }, duration)
    }
  },
  error(message: string, duration = 5000) {
    const id = ++toastId
    toasts.push({ id, message, type: 'error', duration })
    listeners.forEach(l => l([...toasts]))
    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === id)
        if (index > -1) {
          toasts.splice(index, 1)
          listeners.forEach(l => l([...toasts]))
        }
      }, duration)
    }
  },
  info(message: string, duration = 3000) {
    const id = ++toastId
    toasts.push({ id, message, type: 'info', duration })
    listeners.forEach(l => l([...toasts]))
    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === id)
        if (index > -1) {
          toasts.splice(index, 1)
          listeners.forEach(l => l([...toasts]))
        }
      }, duration)
    }
  }
}
