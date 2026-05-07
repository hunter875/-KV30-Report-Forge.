import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { reportApi } from '@/features/report/api'
import { CanonicalReport, ThemeMode } from '@/types/report'

interface AggregatePreviewProps {
  reportId: string
  theme: ThemeMode
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultMonthRange(anchorIso: string): { startDate: string; endDate: string } {
  const anchor = new Date(`${anchorIso}T00:00:00`)
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end)
  }
}

export const AggregatePreview: React.FC<AggregatePreviewProps> = ({ reportId: _reportId, theme }) => {
  const isDark = theme === 'dark'
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [data, setData] = useState<CanonicalReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const range = getDefaultMonthRange(toIsoDate(new Date()))
    setStartDate(range.startDate)
    setEndDate(range.endDate)
  }, [])

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return
    try {
      setLoading(true)
      setError(null)
      const result = await reportApi.aggregateJson(startDate, endDate)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu tổng hợp')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const palette = {
    panel: isDark ? '#111827' : '#ffffff',
    subpanel: isDark ? '#0f172a' : '#f8fafc',
    border: isDark ? '#334155' : '#d8dee6',
    text: isDark ? '#e5e7eb' : '#111827',
    muted: isDark ? '#94a3b8' : '#667085',
    accent: isDark ? '#3b82f6' : '#0d6efd',
    success: isDark ? '#10b981' : '#198754',
    warning: isDark ? '#f59e0b' : '#ffc107',
    danger: isDark ? '#ef4444' : '#dc3545'
  }

  // Extract summary numbers
  const summary = useMemo(() => {
    if (!data) return null

    // Get fire count from statistics STT 2 or from tong_vu_chay list
    const fireCount = Math.max(
      data.bang_thong_ke.find(row => row.stt === '2')?.ket_qua || 0,
      data.danh_sach_tong_vu_chay?.length || 0
    )

    // Get CNCH count from statistics STT 14 or from cnch list
    const cnchCount = Math.max(
      data.bang_thong_ke.find(row => row.stt === '14')?.ket_qua || 0,
      data.danh_sach_cnch.length || 0
    )

    const sclqCount = data.danh_sach_sclq?.length || 0

    // Kiểm tra PCCC: sum from stats around STT 31-34
    let kiemTraCount = 0
    for (let i = 31; i <= 34; i++) {
      const row = data.bang_thong_ke.find(r => r.stt === String(i))
      kiemTraCount += row?.ket_qua || 0
    }

    // Tuyên truyền: sum from stats around STT 55-61
    let tuyenTruyenCount = 0
    for (let i = 55; i <= 61; i++) {
      const row = data.bang_thong_ke.find(r => r.stt === String(i))
      tuyenTruyenCount += row?.ket_qua || 0
    }

    return {
      fireCount,
      cnchCount,
      sclqCount,
      kiemTraCount,
      tuyenTruyenCount,
      totalEvents: data.danh_sach_cnch.length + (data.danh_sach_sclq?.length || 0) + (data.danh_sach_tong_vu_chay?.length || 0)
    }
  }, [data])

  // Recent events for table
  const recentEvents = useMemo(() => {
    if (!data) return []

    const events: Array<{
      type: 'CNCH' | 'SCLQ' | 'TỔNG VỤ CHÁY'
      stt: number
      date: string
      location: string
      description: string
    }> = []

    data.danh_sach_cnch.forEach(item => {
      events.push({
        type: 'CNCH',
        stt: item.stt,
        date: item.ngay_xay_ra || item.thoi_gian || '-',
        location: item.dia_diem || '-',
        description: item.mo_ta || item.ket_qua_xu_ly || '-'
      })
    })

    data.danh_sach_sclq?.forEach(item => {
      events.push({
        type: 'SCLQ',
        stt: item.stt,
        date: item.vu_chay_ngay,
        location: item.dia_diem,
        description: item.nguyen_nhan || item.thiet_hai || '-'
      })
    })

    data.danh_sach_tong_vu_chay?.forEach(item => {
      events.push({
        type: 'TỔNG VỤ CHÁY',
        stt: item.stt,
        date: item.ngay_xay_ra || item.thoi_gian || '-',
        location: item.dia_diem,
        description: item.vu_chay || item.nguyen_nhan || '-'
      })
    })

    // Sort by date (most recent first)
    return events.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'))
      const dateB = new Date(b.date.split('/').reverse().join('-'))
      return dateB.getTime() - dateA.getTime()
    }).slice(0, 20) // Limit to 20 recent events
  }, [data])

  const formatRange = () => {
    if (!startDate || !endDate) return ''
    const start = new Date(`${startDate}T00:00:00`).toLocaleDateString('vi-VN')
    const end = new Date(`${endDate}T00:00:00`).toLocaleDateString('vi-VN')
    return `${start} - ${end}`
  }

  return (
    <div style={{ display: 'grid', gap: '16px', color: palette.text }}>
      {/* Header with date range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Tổng hợp báo cáo</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', color: palette.muted }}>Từ ngày:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{
              padding: '6px 10px',
              border: `1px solid ${palette.border}`,
              background: palette.panel,
              color: palette.text,
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
          <label style={{ fontSize: '13px', color: palette.muted }}>Đến ngày:</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{
              padding: '6px 10px',
              border: `1px solid ${palette.border}`,
              background: palette.panel,
              color: palette.text,
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '6px 12px',
              border: 'none',
              background: palette.accent,
              color: 'white',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {loading ? 'Đang tải...' : 'Tải'}
          </button>
        </div>
      </div>

      {/* Date range display */}
      <div style={{ fontSize: '14px', color: palette.muted }}>
        Khoảng dữ liệu: {formatRange()}
      </div>

      {error && (
        <div style={{ padding: '12px', background: `${palette.danger}20`, color: palette.danger, borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div style={{ padding: '20px', textAlign: 'center', color: palette.muted }}>
          Đang tải dữ liệu tổng hợp...
        </div>
      )}

      {!loading && data && summary && (
        <>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(140px, 1fr))',
            gap: '12px'
          }}>
            <SummaryCard label="Tổng vụ cháy" value={summary.fireCount} palette={palette} />
            <SummaryCard label="CNCH" value={summary.cnchCount} palette={palette} />
            <SummaryCard label="SCLQ" value={summary.sclqCount} palette={palette} />
            <SummaryCard label="Kiểm tra PCCC" value={summary.kiemTraCount} palette={palette} />
            <SummaryCard label="Tuyên truyền" value={summary.tuyenTruyenCount} palette={palette} />
          </div>

          {/* Recent Events Table */}
          <div style={{ background: palette.panel, border: `1px solid ${palette.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px',
              background: palette.subpanel,
              borderBottom: `1px solid ${palette.border}`
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: palette.text }}>
                Danh sách vụ việc (20 gần nhất)
              </h3>
            </div>
            {recentEvents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: palette.muted }}>
                Không có dữ liệu sự cố trong khoảng thời gian này
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: palette.subpanel }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${palette.border}`, color: palette.muted, fontWeight: 700 }}>Loại</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${palette.border}`, color: palette.muted, fontWeight: 700 }}>STT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${palette.border}`, color: palette.muted, fontWeight: 700 }}>Ngày</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${palette.border}`, color: palette.muted, fontWeight: 700 }}>Địa điểm</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: `1px solid ${palette.border}`, color: palette.muted, fontWeight: 700 }}>Mô tả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEvents.map((event, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${palette.border}` }}>
                        <td style={{ padding: '10px 12px', color: event.type === 'CNCH' ? palette.accent : event.type === 'SCLQ' ? palette.warning : palette.danger, fontWeight: 600 }}>{event.type}</td>
                        <td style={{ padding: '10px 12px', color: palette.text }}>{event.stt}</td>
                        <td style={{ padding: '10px 12px', color: palette.text }}>{event.date}</td>
                        <td style={{ padding: '10px 12px', color: palette.text }}>{event.location}</td>
                        <td style={{ padding: '10px 12px', color: palette.text }}>{event.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stats note */}
          <div style={{ fontSize: '13px', color: palette.muted }}>
            Số liệu được tổng hợp từ {summary.totalEvents} sự cố/vụ việc trong khoảng thời gian {formatRange()}. Các số liệu kiểm tra và tuyên truyền lấy từ bảng thống kê.
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, palette }: { label: string; value: number; palette: any }) {
  return (
    <div style={{
      background: palette.panel,
      border: `1px solid ${palette.border}`,
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{ color: palette.muted, fontSize: '12px', fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: '8px', fontSize: '28px', fontWeight: 800, color: palette.accent }}>
        {value}
      </div>
    </div>
  )
}

export default AggregatePreview
