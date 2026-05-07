import { useCallback } from 'react'
import { useReportStore, ReportState } from './store'
import { reportApi } from './api'
import { Operation, SaveStatus, BulkResponse } from '@/types/report'

interface UseReportAutosaveOptions {
  reportId: string
  pendingOps: Operation[]
  onStatusChange: (status: SaveStatus, message?: string) => void
  onVersionUpdate: (newVersion: number) => void
  onConflict?: (serverVersion: number) => void
}

/**
 * Hook for manual save with optimistic locking
 *
 * This hook provides a save function that:
 * - Sends pending operations to backend
 * - Updates version on success
 * - Handles conflict by triggering reload event
 * - Returns save result
 */
export function useReportAutosave({
  reportId,
  pendingOps,
  onStatusChange,
  onVersionUpdate,
  onConflict
}: UseReportAutosaveOptions) {
  const { setVersion } = useReportStore()
  const version = useReportStore((state: ReportState) => state.version)

  /**
   * Execute save with current pending operations
   */
  const save = useCallback(async (): Promise<BulkResponse | null> => {
    if (pendingOps.length === 0) return null

    try {
      onStatusChange('saving')
      const result: BulkResponse = await reportApi.bulkOperations(
        reportId,
        version,
        pendingOps
      )

      if (result.status === 'ok' && result.version) {
        // Success
        setVersion(result.version)
        onVersionUpdate(result.version)
        onStatusChange('saved')

        // Auto-clear saved status after delay
        setTimeout(() => {
          onStatusChange('idle')
        }, 2000)

        return result
      } else if (result.status === 'conflict') {
        // Conflict detected
        onStatusChange('conflict')
        onConflict?.(result.server_version || 0)

        // Dispatch custom event for parent to handle reload
        window.dispatchEvent(new CustomEvent('report-conflict', {
          detail: {
            reportId,
            serverVersion: result.server_version,
            currentVersion: version
          }
        }))

        return result
      } else {
        onStatusChange('error')
        return result
      }
    } catch (error) {
      console.error('Save failed:', error)
      onStatusChange('error')
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, [reportId, version, pendingOps, onStatusChange, onVersionUpdate, onConflict, setVersion])

  return {
    save,
    hasPendingOps: pendingOps.length > 0
  }
}

export default useReportAutosave
