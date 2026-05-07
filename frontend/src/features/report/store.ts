import { create, StateCreator } from 'zustand'
import { Report, ReportTab, SaveStatus } from '@/types/report'

export interface ReportState {
  // Report data
  currentReport: Report | null
  version: number

  // UI state
  activeTab: ReportTab
  saveStatus: SaveStatus
  conflictMessage: string | null

  // Actions
  setCurrentReport: (report: Report | null) => void
  setActiveTab: (tab: ReportTab) => void
  setVersion: (version: number) => void
  setSaveStatus: (status: SaveStatus) => void
  setConflictMessage: (message: string | null) => void
  resetConflict: () => void
}

const initializer: StateCreator<ReportState> = (set) => ({
  // Initial state
  currentReport: null,
  version: 1,
  activeTab: 'bc_ngay',
  saveStatus: 'idle',
  conflictMessage: null,

  // Actions
  setCurrentReport: (report: Report | null) => set({
    currentReport: report,
    version: report?.version || 1,
    saveStatus: 'idle',
    conflictMessage: null
  }),

  setActiveTab: (tab: ReportTab) => set({ activeTab: tab }),

  setVersion: (newVersion: number) => set({ version: newVersion }),

  setSaveStatus: (status: SaveStatus) => set({ saveStatus: status }),

  setConflictMessage: (message: string | null) => set({ conflictMessage: message }),

  resetConflict: () => set({
    conflictMessage: null,
    saveStatus: 'idle'
  })
})

export const useReportStore = create<ReportState>(initializer)
