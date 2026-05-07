import React, { useState } from 'react'
import { ThemeMode } from '@/types/report'

interface JsonNodeProps {
  data: any
  keyName?: string
  depth: number
  theme: ThemeMode
}

const INDENT = 20

function JsonNode({ data, keyName, depth, theme }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(false)
  const isDark = theme === 'dark'

  const isExpandable = data !== null && typeof data === 'object'
  const type = Array.isArray(data) ? 'array' : typeof data
  const size = isExpandable ? Object.keys(data).length : 0

  const palette = {
    key: isDark ? '#9cdcfe' : '#0451a5',
    string: isDark ? '#ce9178' : '#a31515',
    number: isDark ? '#b5cea8' : '#098658',
    boolean: isDark ? '#569cd6' : '#0000ff',
    null: isDark ? '#569cd6' : '#808080',
    bracket: isDark ? '#ffd700' : '#800080',
    muted: isDark ? '#6b7280' : '#9ca3af'
  }

  const handleToggle = () => {
    if (isExpandable) {
      setCollapsed(!collapsed)
    }
  }

  const renderValue = () => {
    if (data === null) {
      return <span style={{ color: palette.null }}>null</span>
    }
    switch (type) {
      case 'string':
        return <span style={{ color: palette.string }}>"{data}"</span>
      case 'number':
        return <span style={{ color: palette.number }}>{data}</span>
      case 'boolean':
        return <span style={{ color: palette.boolean }}>{String(data)}</span>
      default:
        return null
    }
  }

  const renderContent = () => {
    const indent = depth * INDENT

    // Render key name if provided
    const keyPart = keyName !== undefined ? (
      <>
        <span style={{ color: palette.key, marginRight: '4px' }}>"{keyName}"</span>
        <span>: </span>
      </>
    ) : null

    // Render brackets for objects/arrays
    if (isExpandable) {
      return (
        <div>
          <div
            style={{
              paddingLeft: `${indent}px`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              minHeight: '20px'
            }}
            onClick={handleToggle}
          >
            <span style={{ width: '16px', display: 'inline-block', textAlign: 'center' }}>
              {collapsed ? '▶' : '▼'}
            </span>
            {keyPart}
            <span style={{ color: palette.bracket }}>
              {Array.isArray(data) ? '[' : '{'}
            </span>
            {!collapsed && (
              <>
                <span style={{ color: palette.muted, marginLeft: '8px', fontSize: '11px' }}>
                  {size} {Array.isArray(data) ? 'items' : 'keys'}
                </span>
                <span style={{ color: palette.bracket }}>
                  {Array.isArray(data) ? ']' : '}'}
                </span>
              </>
            )}
            {collapsed && (
              <span style={{ color: palette.bracket }}>
                {' '}{Array.isArray(data) ? '...]' : '...}'}
              </span>
            )}
          </div>

          {!collapsed && (
            <div>
              {Object.entries(data).map(([k, v], _idx) => (
                <JsonNode
                  key={k}
                  data={v}
                  keyName={Array.isArray(data) ? undefined : k}
                  depth={depth + 1}
                  theme={theme}
                />
              ))}
              <div style={{ paddingLeft: `${indent}px` }}>
                <span style={{ color: palette.bracket }}>
                  {Array.isArray(data) ? ']' : '}'}
                </span>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Render primitive value
    return (
      <div
        style={{
          paddingLeft: `${indent}px`,
          display: 'flex',
          alignItems: 'center',
          minHeight: '20px'
        }}
      >
        {keyPart}
        {renderValue()}
        {type !== 'undefined' && (
          <span style={{ color: palette.muted, marginLeft: '8px', fontSize: '11px' }}>
            {type}
          </span>
        )}
      </div>
    )
  }

  return renderContent()
}

interface JsonTreeViewProps {
  data: any
  theme: ThemeMode
  onDataChange?: (data: any) => void
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, theme }) => {
  const isDark = theme === 'dark'

  const palette = {
    text: isDark ? '#e5e7eb' : '#111827',
    background: isDark ? '#0f172a' : '#f8fafc',
    border: isDark ? '#334155' : '#d8dee6',
    headerBg: isDark ? '#1e293b' : '#e2e8f0'
  }

  return (
    <div
      style={{
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: '8px',
        padding: '16px',
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '13px',
        lineHeight: 1.5,
        overflow: 'auto',
        maxHeight: '680px'
      }}
    >
      <JsonNode data={data} depth={0} theme={theme} />
    </div>
  )
}

export default JsonTreeView
