import React, { useCallback, useMemo, useRef, useState } from 'react'
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import {
  GridColumn,
  GridRow,
  Operation,
  DomainRowType
} from '@/types/report'

registerAllModules()

interface SpreadsheetGridProps {
  rows: GridRow[]
  columns: GridColumn[]
  rowType: DomainRowType
  onOperationsChange: (operations: Operation[]) => void
  hideHeaders?: boolean
  hideRowHeaders?: boolean
  title?: string
  titleBgColor?: string
  headerBgColor?: string
  theme?: 'light' | 'dark'
}

interface ValidationError {
  message: string
  type: 'number' | 'date' | 'required'
}

// Error message templates
const ERROR_MESSAGES = {
  number: 'Giá trị phải là số hợp lệ',
  date: 'Ngày tháng không hợp lệ (Định dạng: DD/MM/YYYY)',
  required: 'Trường này là bắt buộc'
}

export const SpreadsheetGrid = ({
  rows,
  columns,
  rowType,
  onOperationsChange,
  hideHeaders = false,
  hideRowHeaders = false,
  title,
  titleBgColor = '#d9ead3',
  headerBgColor = '#ffffff',
  theme = 'light'
}: SpreadsheetGridProps) => {
  const hotRef = useRef<any>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [invalidCells, setInvalidCells] = useState<Map<string, ValidationError>>(new Map())
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const isDark = theme === 'dark'

  // Responsive: detect mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Validate a value based on column type
  const validateCell = useCallback((column: GridColumn, value: any): { valid: boolean; error?: ValidationError } => {
    if (value === '' || value === null || value === undefined) {
      return { valid: true } // Allow empty
    }

    if (column.type === 'number') {
      const num = Number(value)
      if (isNaN(num) || !isFinite(num)) {
        return { valid: false, error: { message: ERROR_MESSAGES.number, type: 'number' } }
      }
      return { valid: true }
    }

    if (column.type === 'date') {
      const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      if (!datePattern.test(value)) {
        return { valid: false, error: { message: ERROR_MESSAGES.date, type: 'date' } }
      }
      const [day, month, year] = value.split('/').map(Number)
      const date = new Date(year, month - 1, day)
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return { valid: false, error: { message: ERROR_MESSAGES.date, type: 'date' } }
      }
      return { valid: true }
    }

    return { valid: true }
  }, [])

  // Build data array for HotTable
  const data = useMemo(() => {
    return rows.map(row => {
      const rowData: any = {}
      columns.forEach(col => {
        rowData[col.key] = row[col.key] !== undefined ? row[col.key] : ''
      })
      return rowData
    })
  }, [rows, columns])

  // Get column settings for Handsontable
  const hotColumns = useMemo(() => {
    return columns.map(col => ({
      data: col.key,
      type: col.type === 'number' ? 'numeric' : col.type,
      readOnly: col.readonly || false,
      width: col.width,
      numericFormat: col.type === 'number' ? { pattern: '0' } : undefined,
      dateFormat: col.type === 'date' ? 'DD/MM/YYYY' : undefined,
      correctFormat: true,
      allowInvalid: false
    }))
  }, [columns])

  // Handle cell changes
  const afterChange = useCallback((
    changes: [number, string, any, any][] | null,
    source: string
  ) => {
    if (!changes || source === 'loadData') return

    const newInvalidCells = new Map(invalidCells)
    const newOperations: Operation[] = []

    changes.forEach(([rowIndex, colKey, _oldValue, newValue]) => {
      const row = rows[rowIndex]
      if (!row) return

      const column = columns.find(c => c.key === colKey)
      if (!column || column.readonly) return

      // Remove old invalid marker for this cell
      const cellKey = `${rowIndex}-${colKey}`
      newInvalidCells.delete(cellKey)

      // Validate new value
      const validation = validateCell(column, newValue)
      if (!validation.valid && validation.error) {
        newInvalidCells.set(cellKey, validation.error)
      }

      if (row.id) {
        newOperations.push({
          type: 'update',
          row_id: row.id,
          row_type: rowType,
          stt: row.stt,
          data: { [colKey]: newValue }
        })
      } else {
        const fullPayload: Record<string, any> = {}
        columns.forEach(col => {
          fullPayload[col.key] = row[col.key] !== undefined ? row[col.key] : ''
        })
        fullPayload[colKey] = newValue

        newOperations.push({
          type: 'create',
          temp_id: row.temp_id,
          row_type: rowType,
          stt: row.stt,
          data: fullPayload
        })
      }
    })

    if (newOperations.length > 0) {
      onOperationsChange(newOperations)
    }

    setInvalidCells(newInvalidCells)
  }, [rows, columns, rowType, onOperationsChange, invalidCells, validateCell])

  // Handle row insertions
  const afterCreateRow = useCallback((
    index: number,
    amount: number,
    source: string
  ) => {
    if (source !== 'copy' && source !== 'paste' && source !== 'autofill') return

    const newRows = rows.slice(index, index + amount)

    const newOps: Operation[] = newRows.map(row => {
      const fullPayload: Record<string, any> = {}
      columns.forEach(col => {
        fullPayload[col.key] = row[col.key] !== undefined ? row[col.key] : ''
      })

      return {
        type: 'create',
        temp_id: row.temp_id,
        row_type: rowType,
        stt: row.stt,
        data: fullPayload
      }
    })

    if (newOps.length > 0) {
      onOperationsChange(newOps)
    }
  }, [rows, columns, rowType, onOperationsChange])

  // Handle row deletions
  const afterRemoveRow = useCallback((
    index: number,
    amount: number,
    source: string
  ) => {
    if (source !== 'auto' || amount <= 0) return

    const deletedRows = rows.slice(index, index + amount)

    const newOps: Operation[] = deletedRows
      .filter(row => row.id)
      .map(row => ({
        type: 'delete',
        row_id: row.id!
      }))

    if (newOps.length > 0) {
      onOperationsChange(newOps)
    }
  }, [rows, onOperationsChange])

  // Column headers: false if using custom header
  const colHeaders = hideHeaders || title ? false : columns.map(col => col.title)

  // Sticky first column (STT) if present
  const firstColumnIsSticky = columns[0]?.key === 'stt'
  const fixedColumnsLeft = firstColumnIsSticky ? 1 : 0
  const tableWidth = columns.reduce((total, column) => total + (column.width || 120), 0)

  const syncHeaderScroll = useCallback(() => {
    const hotInstance = hotRef.current?.hotInstance
    const scrollLeft = hotInstance?.scrollable?.contentScrollLeft
    if (headerRef.current && typeof scrollLeft === 'number') {
      headerRef.current.scrollLeft = scrollLeft
    }
  }, [])

  // Cell styling for validation
  const cells = useCallback((row: number, col: number, prop: string | number) => {
    const colKey = typeof prop === 'string' ? prop : columns[col]?.key
    if (!colKey) return {}

    const cellKey = `${row}-${colKey}`
    const hasError = invalidCells.has(cellKey)
    const isHovered = hoveredCell?.row === row && hoveredCell?.col === col

    if (hasError) {
      return {
        className: 'htInvalidCell',
        style: {
          border: '2px solid #dc3545 !important',
          backgroundColor: isDark ? '#450a0a' : '#f8d7da',
          position: 'relative' as const
        }
      }
    }

    // Subtle hover effect for valid cells
    if (isHovered) {
      return {
        style: {
          boxShadow: 'inset 0 0 0 2px rgba(13, 110, 253, 0.3)',
          transition: 'box-shadow 0.15s ease'
        }
      }
    }

    return {}
  }, [columns, invalidCells, hoveredCell, isDark])

  // Handle mouse over cells for tooltip
  const afterOnCellMouseOver = useCallback((_event: any, coords: { row: number; col: number }) => {
    if (!coords || coords.row < 0 || coords.col < 0) {
      setHoveredCell(null)
      setTooltipPosition(null)
      return
    }

    const colKey = columns[coords.col]?.key
    if (!colKey) return

    const cellKey = `${coords.row}-${colKey}`
    if (invalidCells.has(cellKey)) {
      const error = invalidCells.get(cellKey)
      const hotInstance = hotRef.current?.hotInstance
      if (hotInstance && error) {
        const cell = hotInstance.getCell(coords.row, coords.col)
        if (cell) {
          const rect = cell.getBoundingClientRect()
          setTooltipPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 8
          })
          setHoveredCell({ row: coords.row, col: coords.col })
        }
      }
    } else {
      setHoveredCell(null)
      setTooltipPosition(null)
    }
  }, [columns, invalidCells])

  const afterOnCellMouseOut = useCallback(() => {
    setHoveredCell(null)
    setTooltipPosition(null)
  }, [])

  const settings = {
    data,
    colHeaders,
    columns: hotColumns,
    rowHeaders: !hideRowHeaders,
    height: isMobile ? '400px' : '600px',
    width: '100%',
    licenseKey: 'non-commercial-and-evaluation',
    afterChange,
    afterCreateRow,
    afterRemoveRow,
    afterScroll: syncHeaderScroll,
    afterOnCellMouseOver,
    afterOnCellMouseOut,
    cells,
    stickyHeaders: !hideHeaders,
    fixedColumnsLeft,
    fillHandle: true,
    copyPaste: {
      pasteMode: 'overwrite',
      autoColumnSize: false
    },
    autoWrapRow: true,
    wrapCells: true,
    tabStops: 1000,
    allowInsertRow: true,
    allowInvalid: false,
    viewportRowRenderingOffset: 20,
    viewportColumnRenderingOffset: 5
  }

  // Validation error tooltip (inline absolute positioning)
  const renderTooltip = () => {
    if (!tooltipPosition || !hoveredCell) return null

    const cellKey = `${hoveredCell.row}-${hoveredCell.col}`
    const error = invalidCells.get(cellKey)

    if (!error) return null

    return (
      <div
        style={{
          position: 'fixed',
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: 'translate(-50%, -100%)',
          background: '#dc3545',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          whiteSpace: 'nowrap',
          pointerEvents: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚠️</span>
          <span>{error.message}</span>
        </div>
        <div style={{
          position: 'absolute',
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid #dc3545'
        }} />
      </div>
    )
  }

  if (!title) {
    return (
      <>
        <HotTable ref={hotRef} {...settings} />
        {renderTooltip()}
      </>
    )
  }

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div
        ref={headerRef}
        style={{
          overflowX: 'auto',
          border: '1px solid #222',
          borderBottom: 'none',
          maxWidth: '100%'
        }}
      >
        <table
          style={{
            width: `${tableWidth}px`,
            tableLayout: 'fixed',
            borderCollapse: 'collapse'
          }}
        >
          <colgroup>
            {columns.map(column => (
              <col key={column.key} style={{ width: `${column.width || 120}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                colSpan={columns.length}
                style={{
                  background: titleBgColor,
                  border: '1px solid #222',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '13px',
                  padding: '5px 8px',
                  textAlign: 'center'
                }}
              >
                {title}
              </th>
            </tr>
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  style={{
                    background: headerBgColor,
                    border: '1px solid #222',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '12px',
                    lineHeight: 1.2,
                    padding: '6px 8px',
                    textAlign: 'center',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      <div style={{ border: '1px solid #dee2e6', borderTop: 'none' }}>
        <HotTable ref={hotRef} {...settings} />
      </div>
      {renderTooltip()}
    </div>
  )
}

export default SpreadsheetGrid
