import { useCallback, useMemo } from 'react'
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import { KeyValueRow, Operation } from '@/types/report'

registerAllModules()

interface OperationKeyValueGridProps {
  rows: KeyValueRow[]  // Should have operation field rows
  rowType: 'operation'
  onOperationsChange: (operations: Operation[]) => void
}

/**
 * Key-value grid for the single-row operation table (TỔNG HỢP NGHIỆP VỤ)
 *
 * Displays fields in a 2-column layout:
 * - Left: Field labels (readonly)
 * - Right: Editable values (text or number based on field)
 *
 * Changes generate a single "operation" create/update operation.
 */
export const OperationKeyValueGrid = ({
  rows,
  rowType,
  onOperationsChange
}: OperationKeyValueGridProps) => {
  // Transform key-value rows into HotTable data format
  const data = useMemo(() => {
    return rows.map(row => ({
      key: row.key,
      label: row.label,
      value: row.value
    }))
  }, [rows])

  const hotColumns = useMemo(() => [
    {
      data: 'label',
      title: 'Chỉ tiêu',
      readOnly: true,
      width: 350
    },
    {
      data: 'value',
      title: 'Giá trị',
      width: 250
    }
  ], [])

  // Build full payload from all field values
  const buildFullPayload = useCallback(() => {
    const payload: Record<string, any> = {}
    rows.forEach(row => {
      payload[row.key] = row.value
    })
    return payload
  }, [rows])

  // Handle cell changes
  const afterChange = useCallback((
    changes: [number, string, any, any][] | null,
    source: string
  ) => {
    if (!changes || source === 'loadData') return

    changes.forEach(([rowIndex, colKey, , newValue]) => {
      if (colKey !== 'value') return  // Only value column is editable

      const row = rows[rowIndex]
      if (!row) return

      const fullPayload = buildFullPayload()
      fullPayload[row.key] = newValue
      const operation: Operation = row.row_id ? {
        type: 'update',
        row_id: row.row_id,
        row_type: rowType,
        data: fullPayload
      } : {
        type: 'create',
        row_type: rowType,
        data: fullPayload
      }

      onOperationsChange([operation])
    })
  }, [rows, rowType, onOperationsChange, buildFullPayload])

  // Render cell content with proper formatting
  const renderer = useCallback((_instance: any, td: HTMLElement, row: number, col: number, _prop: any, value: any, _cellProperties: any) => {
    if (col === 1) {  // Value column
      const rowData = rows[row]
      if (rowData && rowData.type === 'number') {
        // Right align numbers
        td.style.textAlign = 'right'
        td.style.padding = '8px'
        td.textContent = value !== undefined && value !== '' ? Number(value).toLocaleString('vi-VN') : ''
      } else {
        // Left align text
        td.style.textAlign = 'left'
        td.style.padding = '8px'
        td.textContent = value ?? ''
      }
    } else {
      // Label column
      td.style.textAlign = 'left'
      td.style.fontWeight = '500'
      td.style.padding = '8px'
      td.textContent = value ?? ''
    }
  }, [rows])

  const settings = {
    data,
    colHeaders: ['Chỉ tiêu', 'Giá trị'],
    columns: hotColumns,
    rowHeaders: false,
    height: '500px',
    width: '100%',
    licenseKey: 'non-commercial-and-evaluation',
    afterChange,
    stickyHeaders: false,
    fillHandle: false,
    copyPaste: {
      pasteMode: 'overwrite'
    },
    cells: (_row: number, col: number) => {
      return {
        readOnly: col === 0  // Only label column is readonly
      }
    },
    renderer
  }

  return <HotTable {...settings} />
}

export default OperationKeyValueGrid
