import { useEffect, useState, useMemo } from 'react'
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import { ReportRow, Operation } from '@/types/report'

registerAllModules()

interface SpreadsheetProps {
  reportId: string
  rows: ReportRow[]
  version: number
  onOpsChange: (count: number) => void
  onSave: () => void
}

const SpreadsheetTable = (props: SpreadsheetProps) => {
  const { rows, onOpsChange, onSave } = props
  const [ops, setOps] = useState<Operation[]>([])

  // Transform rows to flat data for HotTable
  const flatRows = useMemo(() => {
    return rows.map(row => ({
      id: row.id,
      stt: row.payload?.stt ?? row.stt ?? 0,
      noi_dung: row.payload?.noi_dung ?? '',
      don_vi: row.payload?.don_vi ?? '',
      ket_qua: row.payload?.ket_qua ?? 0,
      ghi_chu: row.payload?.ghi_chu ?? ''
    }))
  }, [rows])

  useEffect(() => {
    onOpsChange(ops.length)
  }, [ops, onOpsChange])

  useEffect(() => {
    if (ops.length > 0) {
      onSave()
    }
  }, [ops, onSave])

  const afterChange = (
    changes: [number, string, any, any][] | null,
    source: string
  ) => {
    if (!changes || source === 'loadData') return

    const newOps: Operation[] = changes.map(([rowIndex, field, , newValue]) => {
      const row = rows[rowIndex]

      // Only allow editing these fields
      const editableFields = ['don_vi', 'ket_qua', 'ghi_chu']
      if (!editableFields.includes(field)) {
        return null  // Skip changes to readonly fields
      }

      if (!row || !row.id) {
        // Create new statistics row
        return {
          type: 'create',
          row_type: 'statistics',
          stt: row?.stt ?? row?.payload?.stt,
          data: {
            [field]: newValue
          }
        }
      }

      // Update existing row
      return {
        type: 'update',
        row_id: row.id,
        row_type: 'statistics',
        stt: row.stt ?? row.payload?.stt,
        data: { [field]: newValue }
      }
    }).filter(Boolean) as Operation[]

    if (newOps.length > 0) {
      setOps(prev => [...prev, ...newOps])
    }
  }

  const hotSettings = {
    data: flatRows,
    colHeaders: ['STT', 'Nội dung', 'Đơn vị', 'Kết quả', 'Ghi chú'],
    columns: [
      { data: 'stt', type: 'numeric', readOnly: true },
      { data: 'noi_dung', type: 'text', readOnly: true },
      { data: 'don_vi', type: 'text' },
      { data: 'ket_qua', type: 'numeric' },
      { data: 'ghi_chu', type: 'text' }
    ],
    afterChange,
    rowHeaders: true,
    height: '600px',
    width: '100%',
    licenseKey: 'non-commercial-and-evaluation'
  }

  return <HotTable {...hotSettings} />
}

export default SpreadsheetTable
