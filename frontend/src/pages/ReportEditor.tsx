import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useReportStore } from '@/features/report/store'
import { reportApi } from '@/features/report/api'
import { useDebounce } from '@/hooks/useDebounce'
import { getRowsByTab } from '@/features/report/utils/rowMapping'
import { getColumnsForTab } from '@/features/report/constants/columns'
import { REPORT_TABS, getTabConfig } from '@/features/report/constants/reportTabs'
import { ReportToolbar } from '@/components/report/ReportToolbar'
import { ReportSidebar, ReportView } from '@/components/report/ReportSidebar'
import { DataJsonView } from '@/components/report/DataJsonView'
import { AggregateJsonView } from '@/components/report/AggregateJsonView'
import { ReportCalendarView } from '@/components/report/ReportCalendarView'
import { ReportOverviewView } from '@/components/report/ReportOverviewView'
import { SpreadsheetGrid } from '@/components/report/SpreadsheetGrid'
import { BCNgayGrid } from '@/components/report/grids/BCNgayGrid'
import { ToastContainer } from '@/components/report/Toast'
import { toast } from '@/components/report/Toast'
import { ActiveReportMode, DateRange, DomainRowType, GridRow, Operation, ReportTab, ThemeMode } from '@/types/report'

function isReportTabView(view: ReportView): view is ReportTab {
  return REPORT_TABS.some(tab => tab.id === view)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dailyRange(date: string): DateRange {
  return { startDate: date, endDate: date }
}

function weekRange(anchorIso: string): DateRange {
  const anchor = new Date(`${anchorIso}T00:00:00`)
  const start = new Date(anchor)
  const mondayOffset = (anchor.getDay() + 6) % 7
  start.setDate(anchor.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) }
}

type InputView = ReportTab | 'overview' | 'calendar'

function getSheetHeaderConfig(tab: ReportTab) {
  switch (tab) {
    case 'cnch':
      return {
        title: 'CỨU NẠN, CỨU HỘ',
        titleBgColor: '#9fc5e8',
        headerBgColor: '#ffffff'
      }
    case 'sclq':
      return {
        title: 'SỰ CỐ LIÊN QUAN ĐẾN PCCC&CNCH',
        titleBgColor: '#d5a6bd',
        headerBgColor: '#d5a6bd'
      }
    default:
      return undefined
  }
}

const ReportEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    currentReport,
    version,
    activeTab,
    saveStatus: storeSaveStatus,
    conflictMessage,
    setCurrentReport,
    setActiveTab,
    setVersion,
    setSaveStatus,
    setConflictMessage,
    resetConflict
  } = useReportStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [activeMode, setActiveMode] = useState<ActiveReportMode>('input')
  const [activeInputView, setActiveInputView] = useState<InputView>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('report-sidebar-collapsed') === '1')
  const [theme, setTheme] = useState<ThemeMode>(() => localStorage.getItem('report-theme') === 'dark' ? 'dark' : 'light')
  const [gridRowsByTab, setGridRowsByTab] = useState<Partial<Record<DomainRowType, GridRow[]>>>({})
  const [selectedSourceReportId, setSelectedSourceReportId] = useState('')
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(() => dailyRange(todayIso()))
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)

  const pendingOpsRef = useRef<Operation[]>([])
  const savingRef = useRef(false)
  const versionRef = useRef(version)
  const isDark = theme === 'dark'
  const sourceReportId = selectedSourceReportId || currentReport?.id || ''
  const selectedDate = selectedDateRange.startDate

  useEffect(() => {
    versionRef.current = version
  }, [version])

  useEffect(() => {
    localStorage.setItem('report-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('report-sidebar-collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await reportApi.getSourceReportFull()
      setCurrentReport(data)
      setSelectedSourceReportId(data.id)
      setVersion(data.version)
      versionRef.current = data.version
      resetConflict()
      if (id || window.location.pathname !== '/kv30') {
        navigate('/kv30', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được kho dữ liệu gốc')
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, resetConflict, setCurrentReport, setSaveStatus, setVersion])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  useEffect(() => {
    if (!currentReport) return

    const nextRows: Partial<Record<DomainRowType, GridRow[]>> = {}
    REPORT_TABS.forEach(tab => {
      nextRows[tab.rowType] = getRowsByTab(currentReport, tab.rowType)
    })
    setGridRowsByTab(nextRows)
  }, [currentReport])

  const debouncedSave = useDebounce(async () => {
    if (savingRef.current || !sourceReportId) return

    const opsToSave = pendingOpsRef.current.slice()
    if (opsToSave.length === 0) return

    const currentVersion = versionRef.current
    let shouldSavePendingOps = false

    try {
      savingRef.current = true
      setSaveStatus('saving')
      const result = await reportApi.bulkOperations(sourceReportId, currentVersion, opsToSave)

      if (result.status === 'ok' && result.version) {
        setVersion(result.version)
        versionRef.current = result.version
        pendingOpsRef.current = pendingOpsRef.current.slice(opsToSave.length)
        setSaveStatus('saved')
        setLastSavedTime(new Date())
        toast.success(`Đã lưu ${opsToSave.length} thay đổi vào kho dữ liệu gốc`)

        shouldSavePendingOps = pendingOpsRef.current.length > 0
        if (!shouldSavePendingOps) {
          setTimeout(() => setSaveStatus('idle'), 1200)
        }
      } else if (result.status === 'conflict') {
        pendingOpsRef.current = []
        setSaveStatus('conflict')
        setConflictMessage(
          `Dữ liệu đã thay đổi ở nơi khác (server v${result.server_version}). Đang tải lại...`
        )
        toast.warning('Xung đột phiên bản, đang tải lại...')
        window.dispatchEvent(new CustomEvent('report-conflict', {
          detail: {
            reportId: sourceReportId,
            serverVersion: result.server_version,
            currentVersion
          }
        }))
      } else {
        pendingOpsRef.current = []
        setSaveStatus('error')
        toast.error('Lưu thất bại, vui lòng thử lại')
        await fetchReport()
      }
    } catch (err) {
      console.error('Save failed:', err)
      pendingOpsRef.current = []
      setSaveStatus('error')
      setConflictMessage('Lưu bị lỗi do dữ liệu đã thay đổi. Đang tải lại kho nguồn...')
      toast.error('Lỗi khi lưu dữ liệu, đang tải lại')
      try {
        await fetchReport()
      } catch {
        setConflictMessage('Không thể tải lại dữ liệu. Vui lòng reload trang.')
      }
    } finally {
      savingRef.current = false
      if (shouldSavePendingOps) {
        debouncedSave()
      }
    }
  }, 1500)

  const handleOperationsChange = useCallback((operations: Operation[]) => {
    if (operations.length === 0) return
    pendingOpsRef.current = [...pendingOpsRef.current, ...operations]
    debouncedSave()
  }, [debouncedSave])

  const handleViewChange = useCallback((view: ReportView) => {
    if (view === 'data_json') {
      setActiveMode('daily_report')
      setSelectedDateRange(range => dailyRange(range.startDate || todayIso()))
      return
    }

    if (view === 'weekly_json') {
      setActiveMode('weekly_report')
      setSelectedDateRange(range => weekRange(range.startDate || todayIso()))
      return
    }

    setActiveMode('input')
    setActiveInputView(view)
    if (isReportTabView(view)) {
      setActiveTab(view)
    }
  }, [setActiveTab])

  const handleCalendarDateSelected = useCallback((date: string, view: ReportView) => {
    if (view === 'data_json') {
      setSelectedDateRange(dailyRange(date))
      setActiveMode('daily_report')
      return
    }

    if (view === 'weekly_json') {
      setSelectedDateRange(weekRange(date))
      setActiveMode('weekly_report')
      return
    }

    setSelectedDateRange(dailyRange(date))
    setActiveMode('input')
    setActiveInputView(view)
    if (isReportTabView(view)) {
      setActiveTab(view)
    }
  }, [setActiveTab])

  const handleReload = useCallback(async () => {
    pendingOpsRef.current = []
    await fetchReport()
  }, [fetchReport])

  const handleSelectedDateChange = useCallback((date: string) => {
    if (activeMode === 'weekly_report') {
      setSelectedDateRange(weekRange(date))
    } else {
      setSelectedDateRange(dailyRange(date))
    }
  }, [activeMode])

  const handleExportWord = async () => {
    if (!sourceReportId) return

    try {
      setExporting(true)
      const blob = await reportApi.exportDocx(sourceReportId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kv30_source_${sourceReportId}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Không thể xuất file Word. Vui lòng thử lại.')
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    const handleConflict = async (event: Event) => {
      const customEvent = event as CustomEvent
      const { serverVersion } = customEvent.detail

      setSaveStatus('conflict')
      setConflictMessage(
        `Dữ liệu đã thay đổi ở nơi khác (server v${serverVersion}). Đang tải lại...`
      )

      try {
        await handleReload()
      } catch {
        setConflictMessage('Không thể tải lại dữ liệu. Vui lòng reload thủ công.')
      }
    }

    window.addEventListener('report-conflict', handleConflict)
    return () => window.removeEventListener('report-conflict', handleConflict)
  }, [handleReload, setConflictMessage, setSaveStatus])

  const activeView: ReportView = activeMode === 'daily_report'
    ? 'data_json'
    : activeMode === 'weekly_report'
      ? 'weekly_json'
      : activeInputView
  const activeReportTab = activeMode === 'input' && isReportTabView(activeInputView) ? activeInputView : activeTab
  const currentTabConfig = useMemo(
    () => getTabConfig(activeReportTab),
    [activeReportTab]
  )
  const columns = useMemo(
    () => (currentTabConfig ? getColumnsForTab(currentTabConfig.rowType) : []),
    [currentTabConfig]
  )
  const currentRows = useMemo(() => {
    if (!currentTabConfig) return []
    return gridRowsByTab[currentTabConfig.rowType] || []
  }, [currentTabConfig, gridRowsByTab])
  const sheetHeaderConfig = useMemo(
    () => getSheetHeaderConfig(activeReportTab),
    [activeReportTab]
  )
  const hasSheetHeader = Boolean(sheetHeaderConfig)

  if (loading) {
    return (
      <div style={centerStateStyle(isDark)}>
        Đang tải dữ liệu...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545', background: isDark ? '#020617' : '#ffffff', minHeight: '100vh' }}>
        <h3>Lỗi</h3>
        <p>{error}</p>
        <button onClick={handleReload} style={primaryButtonStyle}>
          Thử lại
        </button>
      </div>
    )
  }

  if (!currentReport) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: isDark ? '#94a3b8' : '#6c757d', background: isDark ? '#020617' : '#ffffff', minHeight: '100vh' }}>
        Không tìm thấy kho dữ liệu gốc
      </div>
    )
  }

  return (
    <div className={isDark ? 'app-dark' : 'app-light'} style={{ display: 'flex', minHeight: '100vh', background: isDark ? '#020617' : '#ffffff' }}>
      <ReportSidebar
        activeView={activeView}
        collapsed={sidebarCollapsed}
        theme={theme}
        onToggleCollapsed={() => setSidebarCollapsed(value => !value)}
        onViewChange={handleViewChange}
      />

      <main style={{ flex: 1, minWidth: 0, padding: '20px' }}>
        <ReportToolbar
          report={currentReport}
          reportId={sourceReportId}
          saveStatus={storeSaveStatus}
          version={version}
          theme={theme}
          onToggleTheme={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}
          onReload={handleReload}
          onExportWord={handleExportWord}
          isExporting={exporting}
          conflictMessage={conflictMessage || undefined}
          reportDate={selectedDate}
          onReportDateChange={handleSelectedDateChange}
          lastSavedTime={lastSavedTime}
        />

        {activeMode === 'input' && activeInputView === 'overview' ? (
          <ReportOverviewView report={currentReport} theme={theme} onImported={fetchReport} selectedDate={selectedDate} />
        ) : activeMode === 'input' && activeInputView === 'calendar' ? (
          <ReportCalendarView
            currentReportId={sourceReportId}
            currentReportDate={selectedDate}
            sourceReport={currentReport}
            theme={theme}
            onDateSelected={handleCalendarDateSelected}
          />
        ) : activeMode === 'weekly_report' ? (
          <AggregateJsonView
            reportId={sourceReportId}
            mode="week"
            dateRange={selectedDateRange}
            theme={theme}
            onDateRangeChange={setSelectedDateRange}
          />
        ) : activeMode === 'daily_report' ? (
          <DataJsonView
            reportId={sourceReportId}
            dateRange={selectedDateRange}
            version={version}
            theme={theme}
            onDateRangeChange={setSelectedDateRange}
          />
        ) : activeMode === 'input' && currentTabConfig && (
          activeReportTab === 'bc_ngay' ? (
            <BCNgayGrid
              rows={currentRows}
              rowType="statistics"
              onOperationsChange={handleOperationsChange}
            />
          ) : (
            <SpreadsheetGrid
              rows={currentRows}
              columns={columns}
              rowType={currentTabConfig.rowType}
              onOperationsChange={handleOperationsChange}
              hideRowHeaders={hasSheetHeader}
              theme={theme}
              {...(sheetHeaderConfig || {})}
            />
          )
        )}
      </main>

      <ToastContainer theme={theme} />
    </div>
  )
}

function centerStateStyle(isDark: boolean): React.CSSProperties {
  return {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '16px',
    color: isDark ? '#94a3b8' : '#6c757d',
    background: isDark ? '#020617' : '#ffffff'
  }
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
}

export default ReportEditor
