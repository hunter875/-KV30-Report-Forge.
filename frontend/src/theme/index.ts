import { useMemo } from 'react'
import { ThemeMode } from '@/types/report'

export interface ThemeColors {
  // Text colors
  text: string
  textSecondary: string
  textMuted: string

  // Backgrounds
  background: string
  surface: string
  surfaceHover: string
  input: string

  // Borders
  border: string
  borderHover: string

  // Interactive
  primary: string
  primaryHover: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string

  // Special
  headerBg: string
  activeTab: string
  activeTabText: string
  shadow: string
}

const lightTheme: ThemeColors = {
  text: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  background: '#ffffff',
  surface: '#f9fafb',
  surfaceHover: '#f3f4f6',
  input: '#fbfbfc',
  border: '#d0d5dd',
  borderHover: '#9ca3af',
  primary: '#0d6efd',
  primaryHover: '#0b5ed7',
  secondary: '#6c757d',
  success: '#198754',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#0dcaf0',
  headerBg: '#e2e8f0',
  activeTab: '#e7f1ff',
  activeTabText: '#084298',
  shadow: 'rgba(0, 0, 0, 0.1)'
}

const darkTheme: ThemeColors = {
  text: '#e5e7eb',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  background: '#020617',
  surface: '#0f172a',
  surfaceHover: '#1e293b',
  input: '#0f172a',
  border: '#334155',
  borderHover: '#475569',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  secondary: '#6c757d',
  success: '#22c55e',
  warning: '#f59f00',
  error: '#ef4444',
  info: '#06b6d4',
  headerBg: '#1e293b',
  activeTab: '#1e3a8a',
  activeTabText: '#ffffff',
  shadow: 'rgba(0, 0, 0, 0.3)'
}

export interface UseThemeReturn {
  theme: ThemeMode
  isDark: boolean
  colors: ThemeColors
}

export function useTheme(theme: ThemeMode): UseThemeReturn {
  const isDark = theme === 'dark'

  const colors = useMemo(() => {
    return isDark ? darkTheme : lightTheme
  }, [isDark])

  return {
    theme,
    isDark,
    colors
  }
}

export { lightTheme, darkTheme }
