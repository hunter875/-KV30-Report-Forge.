import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportApi } from '@/features/report/api'

export default function ReportLauncher() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Đang mở kho dữ liệu gốc...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function openSourceReport() {
      try {
        await reportApi.getSourceReport()
        if (!cancelled) {
          navigate('/kv30', { replace: true })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không mở được kho dữ liệu gốc')
        }
      }
    }

    openSourceReport()

    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleRetry = async () => {
    try {
      setError(null)
      setMessage('Đang mở kho dữ liệu gốc...')
      await reportApi.getSourceReport()
      navigate('/kv30', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không mở được kho dữ liệu gốc')
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f7f8fa',
        color: '#202428',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}
    >
      <section
        style={{
          width: 'min(460px, calc(100vw - 32px))',
          padding: '24px',
          border: '1px solid #d9dde3',
          borderRadius: '8px',
          background: '#fff',
          boxShadow: '0 10px 30px rgba(20, 28, 38, 0.08)'
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '20px' }}>Data Entry Platform</h1>
        <p style={{ margin: '0 0 18px', color: '#5f6b78', fontSize: '14px' }}>
          {error || message}
        </p>
        {error && (
          <button
            onClick={handleRetry}
            style={{
              border: 0,
              borderRadius: '6px',
              background: '#0d6efd',
              color: '#fff',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Mở lại kho dữ liệu
          </button>
        )}
      </section>
    </main>
  )
}
