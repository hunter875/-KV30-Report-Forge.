import { useMemo, useRef, useEffect, useCallback } from 'react'
import { HotTable } from '@handsontable/react'
import { registerAllModules } from 'handsontable/registry'
import 'handsontable/dist/handsontable.full.min.css'
import { GridRow, Operation } from '@/types/report'
import { BC_NGAY_COLUMNS } from './BCNgayGrid.constants'

registerAllModules()

interface BCNgayGridProps {
  rows: GridRow[]
  rowType: 'statistics'
  onOperationsChange: (operations: Operation[]) => void
}

/**
 * BC NGÀY Grid with 3-tier grouped header
 *
 * Custom header with merged cells and color coding by group.
 * Syncs horizontal scroll between header and grid.
 */
export const BCNgayGrid = ({ rows, rowType, onOperationsChange }: BCNgayGridProps) => {
  const headerRef = useRef<HTMLDivElement>(null)
  const hotRef = useRef<any>(null)

  // Build data for HotTable - include id and stt in source data
  const data = useMemo(() => {
    return rows.map(row => {
      const rowData: any = {
        id: row.id,
        temp_id: row.temp_id,
        stt: row.stt
      }
      BC_NGAY_COLUMNS.forEach(col => {
        rowData[col.key] = row[col.key] !== undefined ? row[col.key] : ''
      })
      return rowData
    })
  }, [rows])

  // HotTable column settings
  const hotColumns = useMemo(() => {
    return BC_NGAY_COLUMNS.map(col => ({
      data: col.key,
      type: col.type === 'number' ? 'numeric' : col.type,
      readOnly: false, // All columns editable for BC NGÀY
      width: col.width,
      numericFormat: col.type === 'number' ? { pattern: '0' } : undefined,
      correctFormat: true,
      allowInvalid: false
    }))
  }, [])

  // Sync header scroll with grid
  useEffect(() => {
    const hotInstance = hotRef.current?.hotInstance
    if (!hotInstance) return

    const handleScroll = () => {
      const scrollLeft = hotInstance.scrollable.contentScrollLeft
      if (headerRef.current) {
        headerRef.current.scrollLeft = scrollLeft
      }
    }

    hotInstance.addHook('afterScroll', handleScroll)

    return () => {
      try {
        if (!hotInstance.isDestroyed) {
          hotInstance.removeHook('afterScroll', handleScroll)
        }
      } catch {
        // Handsontable can destroy the instance before React effect cleanup runs.
      }
    }
  }, [])

  // Handle cell changes
  const afterChange = useCallback((
    changes: [number, string, any, any][] | null,
    source: string
  ) => {
    if (!changes || source === 'loadData') return

    const hotInstance = hotRef.current?.hotInstance
    if (!hotInstance) return

    const newOps: Operation[] = []

    changes.forEach(([rowIndex, colKey, , newValue]) => {
      const row = hotInstance.getSourceDataAtRow(rowIndex)
      if (!row) return

      const column = BC_NGAY_COLUMNS.find(c => c.key === colKey)
      if (!column) return

      if (row.id) {
        newOps.push({
          type: 'update',
          row_id: row.id,
          row_type: rowType,
          stt: row.stt,
          data: { [colKey]: newValue }
        })
      } else {
        const fullPayload: Record<string, any> = {}
        BC_NGAY_COLUMNS.forEach(col => {
          fullPayload[col.key] = row[col.key] !== undefined ? row[col.key] : ''
        })
        fullPayload[colKey] = newValue

        newOps.push({
          type: 'create',
          temp_id: row.temp_id,
          row_type: rowType,
          stt: row.stt,
          data: fullPayload
        })
      }
    })

    if (newOps.length > 0) {
      onOperationsChange(newOps)
    }
  }, [rowType, onOperationsChange])

  // Handle row insertions (paste, copy, autofill)
  const afterCreateRow = useCallback((
    index: number,
    amount: number,
    source: string
  ) => {
    if (source !== 'copy' && source !== 'paste' && source !== 'autofill') return

    const hotInstance = hotRef.current?.hotInstance
    if (!hotInstance) return

    const newOps: Operation[] = []
    for (let i = 0; i < amount; i++) {
      const row = hotInstance.getSourceDataAtRow(index + i)
      if (!row) continue

      const fullPayload: Record<string, any> = {}
      BC_NGAY_COLUMNS.forEach(col => {
        fullPayload[col.key] = row[col.key] !== undefined ? row[col.key] : ''
      })

      newOps.push({
        type: 'create',
        temp_id: row.temp_id,
        row_type: rowType,
        stt: row.stt,
        data: fullPayload
      })
    }

    if (newOps.length > 0) {
      onOperationsChange(newOps)
    }
  }, [rowType, onOperationsChange])

  // Handle row deletions
  const afterRemoveRow = useCallback((
    index: number,
    amount: number,
    source: string
  ) => {
    if (source !== 'auto' || amount <= 0) return

    const hotInstance = hotRef.current?.hotInstance
    if (!hotInstance) return

    const newOps: Operation[] = []
    for (let i = 0; i < amount; i++) {
      const row = hotInstance.getSourceDataAtRow(index + i)
      if (row && row.id) {
        newOps.push({
          type: 'delete',
          row_id: row.id
        })
      }
    }

    if (newOps.length > 0) {
      onOperationsChange(newOps)
    }
  }, [onOperationsChange])

  // Build custom header rows
  const headerRows = useMemo(() => buildHeaderRows(BC_NGAY_COLUMNS), [])

  const settings = {
    data,
    colHeaders: false, // Use custom header
    columns: hotColumns,
    rowHeaders: true,
    rowHeaderWidth: 40,
    height: '600px',
    width: '100%',
    licenseKey: 'non-commercial-and-evaluation',
    afterChange,
    afterCreateRow,
    afterRemoveRow,
    stickyHeaders: false, // Custom header is separate
    fillHandle: true,
    copyPaste: {
      pasteMode: 'overwrite'
    },
    autoWrapRow: true,
    wrapCells: true,
    tabStops: 1000,
    allowInsertRow: true,
    allowInvalid: false
  }

  // Render custom 3-tier header
  const renderHeader = () => (
    <div
      ref={headerRef}
      style={{
        overflowX: 'auto',
        border: '1px solid #dee2e6',
        borderBottom: 'none',
        position: 'relative',
        maxWidth: '100%'
      }}
    >
      <table
        style={{
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          width: `${40 + totalColumnWidth(BC_NGAY_COLUMNS)}px`
        }}
      >
        <colgroup>
          <col style={{ width: '40px' }} />
          {BC_NGAY_COLUMNS.map(col => (
            <col key={col.key} style={{ width: `${col.width || 100}px` }} />
          ))}
        </colgroup>
        <thead>
          {headerRows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {/* STT corner cell - only on first row with rowSpan=3 */}
              {rowIdx === 0 && (
                <th
                  rowSpan={3}
                  style={{
                    width: '40px',
                    minWidth: '40px',
                    background: '#e9ecef',
                    border: '1px solid #dee2e6',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    padding: '4px',
                    fontSize: '12px',
                    color: '#495057'
                  }}
                >
                  STT
                </th>
              )}
              {row.map(cell => {
                return (
                  <th
                    key={cell.key}
                    colSpan={cell.colspan}
                    rowSpan={cell.rowspan}
                    style={{
                      width: `${cell.width}px`,
                      minWidth: `${cell.width}px`,
                      background: cell.bgColor,
                      border: '1px solid #222',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      padding: '3px 6px',
                      fontSize: '10px',
                      color: '#000',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: '1.15'
                    }}
                  >
                    {cell.label}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
      </table>
    </div>
  )

  return (
    <div style={{ width: '100%' }}>
      {renderHeader()}
      <div style={{ border: '1px solid #dee2e6', borderTop: 'none' }}>
        <HotTable ref={hotRef} {...settings} />
      </div>
    </div>
  )
}

// ============== Header Building ==============

interface HeaderCell {
  key: string
  label: string
  rowspan: number
  colspan: number
  width: number
  bgColor: string
}

function columnWidth(column: typeof BC_NGAY_COLUMNS[number]): number {
  return column.width || 100
}

function totalColumnWidth(columns: typeof BC_NGAY_COLUMNS): number {
  return columns.reduce((total, column) => total + columnWidth(column), 0)
}

function makeCell(
  key: string,
  label: string,
  colspan: number,
  rowspan: number,
  width: number,
  bgColor: string
): HeaderCell {
  return { key, label, colspan, rowspan, width, bgColor }
}

function buildHeaderRows(columns: typeof BC_NGAY_COLUMNS): HeaderCell[][] {
  const row1: HeaderCell[] = []
  const row2: HeaderCell[] = []
  const row3: HeaderCell[] = []

  let i = 0
  while (i < columns.length) {
    const column = columns[i]
    const group = column.group || ''

    if (!group) {
      row1.push(makeCell(column.key, column.title, 1, 3, columnWidth(column), '#fff'))
      i += 1
      continue
    }

    const groupStart = i
    const groupColumns = []
    while (i < columns.length && (columns[i].group || '') === group) {
      groupColumns.push(columns[i])
      i += 1
    }

    row1.push(makeCell(
      `group-${groupStart}`,
      group,
      groupColumns.length,
      1,
      totalColumnWidth(groupColumns),
      getGroupColor(group)
    ))

    let j = 0
    while (j < groupColumns.length) {
      const child = groupColumns[j]
      const subgroup = child.subgroup || ''

      if (!subgroup) {
        row2.push(makeCell(child.key, child.title, 1, 2, columnWidth(child), '#fff'))
        j += 1
        continue
      }

      const subgroupStart = j
      const subgroupColumns = []
      while (j < groupColumns.length && (groupColumns[j].subgroup || '') === subgroup) {
        subgroupColumns.push(groupColumns[j])
        j += 1
      }

      row2.push(makeCell(
        `subgroup-${groupStart}-${subgroupStart}`,
        subgroup,
        subgroupColumns.length,
        1,
        totalColumnWidth(subgroupColumns),
        '#fff'
      ))

      subgroupColumns.forEach(subgroupColumn => {
        row3.push(makeCell(
          subgroupColumn.key,
          subgroupColumn.title,
          1,
          1,
          columnWidth(subgroupColumn),
          '#fff'
        ))
      })
    }
  }

  return [row1, row2, row3]
}

function getGroupColor(group: string): string {
  const colors: Record<string, string> = {
    'VỤ CHÁY VÀ CNCH': '#f5dfc8',
    'CÔNG TÁC KIỂM TRA': '#d9ead3',
    'TUYÊN TRUYỀN PCCC': '#ead1dc',
    'HUẤN LUYỆN PCCC': '#ead1dc',
    'TỔNG TUYÊN HUẤN LUYỆN': '#fff2cc',
    'PACC&CNCH của cơ sở theo mẫu PC06': '#fff2cc',
    'PACC&CNCH của CQ CA theo mẫu PC08': '#fff2cc',
    'PA CNCH của CQ CA theo mẫu PC09': '#fff2cc',
    'PACC&CNCH của phương tiện giao thông theo mẫu PC07': '#fff2cc'
  }
  return colors[group] || '#f8f9fa'
}

export { BC_NGAY_COLUMNS }
export default BCNgayGrid
