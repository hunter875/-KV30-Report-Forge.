import React, { useEffect, useState } from 'react'
import { ReportTab, ThemeMode } from '@/types/report'
import { REPORT_TABS } from '@/features/report/constants/reportTabs'

export type ReportView = ReportTab | 'overview' | 'calendar' | 'weekly_json' | 'data_json'

interface ReportSidebarProps {
  activeView: ReportView
  collapsed: boolean
  theme: ThemeMode
  onToggleCollapsed: () => void
  onViewChange: (view: ReportView) => void
}

const Icons = {
  overview: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  json: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 13l-2 2 2 2" />
      <path d="M14 13l2 2-2 2" />
    </svg>
  ),
  week: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <path d="M8 14h8" />
      <path d="M8 18h5" />
    </svg>
  ),
  table: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9" y1="4" x2="9" y2="20" />
    </svg>
  )
}

type SidebarItem = { id: ReportView; label: string; icon: keyof typeof Icons }

const SECTIONS: Array<{ label: string; items: SidebarItem[] }> = [
  {
    label: 'TỔNG QUAN',
    items: [{ id: 'overview', label: 'Tổng quan nguồn', icon: 'overview' }]
  },
  {
    label: 'NHẬP LIỆU',
    items: REPORT_TABS.map(tab => ({ id: tab.id, label: tab.label, icon: 'table' as const }))
  },
  {
    label: 'XUẤT BÁO CÁO',
    items: [
      { id: 'calendar', label: 'Lịch dữ liệu', icon: 'calendar' },
      { id: 'data_json', label: 'Báo cáo ngày', icon: 'json' },
      { id: 'weekly_json', label: 'Báo cáo tuần', icon: 'week' }
    ]
  }
]

export const ReportSidebar: React.FC<ReportSidebarProps> = ({
  activeView,
  collapsed,
  theme,
  onToggleCollapsed,
  onViewChange
}) => {
  const isDark = theme === 'dark'
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [hoveredView, setHoveredView] = useState<ReportView | null>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const width = collapsed ? (isMobile ? 0 : 72) : (isMobile ? 260 : 238)

  const palette = {
    bg: isDark ? '#0f172a' : '#f8fafc',
    border: isDark ? '#334155' : '#d8dee6',
    text: isDark ? '#e2e8f0' : '#344054',
    muted: isDark ? '#94a3b8' : '#667085',
    hover: isDark ? '#1e293b' : '#eef2f7',
    activeBg: isDark ? '#12323f' : '#e0f2fe',
    activeText: isDark ? '#f8fafc' : '#075985',
    activeBorder: '#0ea5e9'
  }

  return (
    <aside
      style={{
        width,
        minWidth: width,
        minHeight: '100vh',
        borderRight: `1px solid ${palette.border}`,
        background: palette.bg,
        padding: collapsed ? '12px 8px' : '16px 12px',
        position: 'sticky',
        top: 0,
        alignSelf: 'stretch',
        transition: 'width 0.2s ease, min-width 0.2s ease, padding 0.2s ease',
        overflowX: 'hidden',
        zIndex: 20
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '8px',
          marginBottom: '14px',
          minHeight: 40
        }}
      >
        {!collapsed && (
          <div style={{ color: palette.muted, fontSize: 13, fontWeight: 800 }}>
            REPORT
          </div>
        )}
        <button
          type="button"
          aria-label={collapsed ? 'Mở sidebar' : 'Đóng sidebar'}
          title={collapsed ? 'Mở sidebar' : 'Đóng sidebar'}
          onClick={onToggleCollapsed}
          style={{
            width: 36,
            height: 36,
            border: `1px solid ${palette.border}`,
            background: isDark ? '#111827' : '#ffffff',
            color: palette.text,
            borderRadius: 6,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
      </div>

      <nav style={{ display: 'grid', gap: 10 }}>
        {SECTIONS.map(section => (
          <div key={section.label} style={{ display: 'grid', gap: 4 }}>
            {!collapsed && (
              <div style={{ padding: '8px 12px 4px', color: palette.muted, fontSize: 11, fontWeight: 800 }}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = activeView === item.id
              const hovered = hoveredView === item.id
              const Icon = Icons[item.icon]

              return (
                <button
                  key={item.id}
                  type="button"
                  title={collapsed ? item.label : undefined}
                  onMouseEnter={() => setHoveredView(item.id)}
                  onMouseLeave={() => setHoveredView(null)}
                  onClick={() => onViewChange(item.id)}
                  style={{
                    width: '100%',
                    height: 44,
                    border: 'none',
                    borderLeft: `4px solid ${active ? palette.activeBorder : 'transparent'}`,
                    background: active ? palette.activeBg : hovered ? palette.hover : 'transparent',
                    color: active ? palette.activeText : palette.text,
                    borderRadius: '0 6px 6px 0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 10,
                    padding: collapsed ? '10px' : '10px 12px',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  <span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon />
                  </span>
                  {!collapsed && (
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default ReportSidebar
