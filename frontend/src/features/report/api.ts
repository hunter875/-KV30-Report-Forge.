import apiClient from '@/lib/axios'
import {
  ActiveReportMode,
  Report,
  BulkOperationsRequest,
  BulkResponse,
  CanonicalReport,
  DomainRowType,
  ImportPreview,
  ReportOverrideEnvelope
} from '@/types/report'

export const reportApi = {
  getAll: async (): Promise<Report[]> => {
    const response = await apiClient.get('/reports')
    return response.data
  },

  getById: async (id: string): Promise<Report> => {
    const response = await apiClient.get(`/reports/${id}`)
    return response.data
  },

  // Get full report with all rows (alias for getById, kept for clarity)
  getReportFull: async (id: string): Promise<Report> => {
    const response = await apiClient.get(`/reports/${id}/full`)
    return response.data
  },

  getSourceReport: async (): Promise<Report> => {
    const response = await apiClient.get('/reports/source')
    return response.data
  },

  getSourceReportFull: async (): Promise<Report> => {
    const response = await apiClient.get('/reports/source/full')
    return response.data
  },

  create: async (title: string, reportDate?: string): Promise<Report> => {
    const response = await apiClient.post('/reports', {
      title,
      ...(reportDate ? { report_date: reportDate } : {})
    })
    return response.data
  },

  bulkOperations: async (
    id: string,
    version: number,
    operations: BulkOperationsRequest['operations']
  ): Promise<BulkResponse> => {
    const payload: BulkOperationsRequest = {
      version,
      operations
    }
    const response = await apiClient.post(`/reports/${id}/bulk`, payload)
    return response.data
  },

  exportDocx: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/reports/${id}/export-docx`, {
      responseType: 'blob'
    })
    return response.data
  },

  exportJson: async (id: string): Promise<CanonicalReport> => {
    const response = await apiClient.get(`/reports/${id}/export`)
    return response.data
  },

  validateExport: async (id: string): Promise<{ valid: boolean; missing: string[] }> => {
    const response = await apiClient.get(`/reports/${id}/validate-export`)
    return response.data
  },

  aggregateJson: async (startDate: string, endDate: string): Promise<CanonicalReport> => {
    const response = await apiClient.get('/reports/aggregate', {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    })
    return response.data
  },

  aggregateReportJson: async (id: string, startDate: string, endDate: string): Promise<CanonicalReport> => {
    const response = await apiClient.get(`/reports/${id}/aggregate`, {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    })
    return response.data
  },

  renderDocxFromJson: async (id: string, data: CanonicalReport, templateName?: string): Promise<Blob> => {
    const response = await apiClient.post(`/reports/${id}/render-docx`, data, {
      params: templateName ? { template_name: templateName } : undefined,
      responseType: 'blob'
    })
    return response.data
  },

  getOverride: async (
    id: string,
    mode: ActiveReportMode,
    startDate: string,
    endDate: string
  ): Promise<ReportOverrideEnvelope> => {
    const response = await apiClient.get(`/reports/${id}/override`, {
      params: {
        mode,
        start_date: startDate,
        end_date: endDate
      }
    })
    return response.data
  },

  saveOverride: async (
    id: string,
    mode: ActiveReportMode,
    startDate: string,
    endDate: string,
    data: CanonicalReport
  ): Promise<ReportOverrideEnvelope> => {
    const response = await apiClient.put(`/reports/${id}/override`, data, {
      params: {
        mode,
        start_date: startDate,
        end_date: endDate
      }
    })
    return response.data
  },

  deleteOverride: async (
    id: string,
    mode: ActiveReportMode,
    startDate: string,
    endDate: string
  ): Promise<{ status: string; deleted: boolean }> => {
    const response = await apiClient.delete(`/reports/${id}/override`, {
      params: {
        mode,
        start_date: startDate,
        end_date: endDate
      }
    })
    return response.data
  },

  previewDocx: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/reports/${id}/export-docx`, {
      responseType: 'blob'
    })
    return response.data
  },

  importRows: async (
    id: string,
    rowType: DomainRowType,
    file: File,
    replace: boolean
  ): Promise<{ status: string; row_type: DomainRowType; imported: number; version: number }> => {
    const formData = new FormData()
    formData.append('row_type', rowType)
    formData.append('replace', String(replace))
    formData.append('file', file)
    const response = await apiClient.post(`/reports/${id}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  previewImportRows: async (
    id: string,
    rowType: DomainRowType,
    file: File
  ): Promise<ImportPreview> => {
    const formData = new FormData()
    formData.append('row_type', rowType)
    formData.append('file', file)
    const response = await apiClient.post(`/reports/${id}/import-preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  importWorkbook: async (
    id: string,
    file: File,
    replace: boolean
  ): Promise<{ status: string; imported: Record<string, number>; version: number }> => {
    const formData = new FormData()
    formData.append('replace', String(replace))
    formData.append('file', file)
    const response = await apiClient.post(`/reports/${id}/import-workbook`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  previewImportWorkbook: async (
    id: string,
    file: File
  ): Promise<ImportPreview> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/reports/${id}/import-workbook-preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  updateMetadata: async (id: string, data: { title?: string; report_date?: string }) => {
    const response = await apiClient.patch(`/reports/${id}`, data)
    return response.data
  }
}
