import React from 'react'
import { ReportTab } from '@/types/report'
import { REPORT_TABS } from '@/features/report/constants/reportTabs'

interface ReportTabsProps {
  activeTab: ReportTab
  onTabChange: (tab: ReportTab) => void
}

export const ReportTabs: React.FC<ReportTabsProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '2px solid #dee2e6',
        marginBottom: '16px'
      }}
    >
      {REPORT_TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === tab.id ? '#007bff' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#495057',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            borderBottom: activeTab === tab.id ? '3px solid #0056b3' : '3px solid transparent',
            marginBottom: '-2px',
            borderRadius: '4px 4px 0 0',
            transition: 'background-color 0.2s, color 0.2s'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default ReportTabs
