import { ReportTab, DomainRowType } from '@/types/report'

export interface TabConfig {
  id: ReportTab
  label: string
  rowType: DomainRowType
  isMultiRow: boolean
}

export const REPORT_TABS: TabConfig[] = [
  { id: 'bc_ngay', label: 'BC NGÀY', rowType: 'statistics', isMultiRow: true },
  { id: 'cnch', label: 'CNCH', rowType: 'cnch_event', isMultiRow: true },
  { id: 'sclq', label: 'SCLQ', rowType: 'sclq', isMultiRow: true }
]

export function getTabConfig(tabId: ReportTab): TabConfig | undefined {
  return REPORT_TABS.find(tab => tab.id === tabId)
}

export function getRowTypeForTab(tabId: ReportTab): DomainRowType {
  const config = getTabConfig(tabId)
  return config?.rowType || (tabId as DomainRowType)
}
