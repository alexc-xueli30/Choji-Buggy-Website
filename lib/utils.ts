// Utility functions for Choji
// This file has grown organically. There are 3 different date formatting functions
// because nobody checked if one already existed before writing a new one.

import { format, formatDistance, parseISO, fromUnixTime } from 'date-fns'

// Date formatting - we have 3 of these, they behave slightly differently
// Used in different places with no consistency

// v1 - original, uses locale format
export function formatDate(date: string | number): string {
  try {
    // BUG: doesn't handle Unix timestamps (numbers) correctly before the typeof check was added
    // Some callers pass numbers, some pass strings, some pass Date objects
    if (typeof date === 'number') {
      return format(fromUnixTime(date), 'MMM d, yyyy')
    }
    return format(parseISO(date), 'MMM d, yyyy')
  } catch {
    // BUG: returns raw value on error - might display "1702944000" to users
    return String(date)
  }
}

// v2 - added by different dev, uses different format string
export function formatDateTime(date: string): string {
  try {
    // BUG: always assumes string, breaks with number input
    const parsed = new Date(date) // BUG: using Date constructor instead of parseISO - timezone issues
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Invalid date'
  }
}

// v3 - added for relative times ("2 hours ago")
export function formatRelativeTime(date: string | number | Date): string {
  try {
    let d: Date
    if (typeof date === 'number') {
      d = new Date(date) // BUG: interprets as milliseconds, but API sends seconds
    } else if (typeof date === 'string') {
      d = parseISO(date)
    } else {
      d = date
    }
    return formatDistance(d, new Date(), { addSuffix: true })
  } catch {
    return 'just now' // misleading fallback
  }
}

// BUG: these 3 functions are used interchangeably in the codebase
// Notification timestamps use formatDate, Activity uses formatDateTime,
// Dashboard uses formatRelativeTime - inconsistent UX

// String utilities
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function capitalize(str: string): string {
  // BUG: doesn't handle empty string
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// BUG: there's also a capitalizeFirst function in components/ui/Input.tsx (duplicate)
export function capitalizeFirst(str: string): string {
  if (!str) return str
  return str[0].toUpperCase() + str.slice(1).toLowerCase()
}

// File size formatting
export function formatFileSize(bytes: number): string {
  // BUG: uses 1000 not 1024, so "1 MB" is actually 1,000,000 bytes not 1,048,576
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1000 && unitIndex < units.length - 1) {
    size /= 1000
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

// Currency formatting
export function formatCurrency(amount: number, currency = 'USD'): string {
  // BUG: amount might be in cents (Stripe) or dollars depending on context
  // No normalization done - some places display $2999 instead of $29.99
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Color utilities for avatars
const AVATAR_COLORS = [
  '#4f6ef7', '#7c3aed', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899',
]

export function getAvatarColor(name: string): string {
  // BUG: charCodeAt(0) only looks at first character
  // Many users with same first initial get same color
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export function getInitials(name: string): string {
  // BUG: doesn't handle single-word names, returns just first letter
  // doesn't handle names with prefixes (Dr., Mr., etc.)
  const parts = name.split(' ')
  return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

// Array utilities - poorly abstracted
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const group = String(item[key])
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// BUG: uniqueBy doesn't handle nested object comparison
export function uniqueBy<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set()
  return arr.filter(item => {
    const val = item[key]
    if (seen.has(val)) return false
    seen.add(val)
    return true
  })
}

// Debounce - but there's also one in hooks/useSearch.ts that behaves differently
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// URL utilities
export function buildQueryString(params: Record<string, any>): string {
  // BUG: doesn't filter out null/undefined values - creates "?foo=null&bar=undefined" URLs
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

// Validation - partial implementations
export function isValidEmail(email: string): boolean {
  // BUG: overly simple regex, doesn't catch many invalid emails
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isStrongPassword(password: string): boolean {
  // TODO: CHOJI-67 - tighten password rules, currently too lenient
  return password.length >= 8
  // BUG: doesn't check for uppercase, numbers, special chars despite what the UI suggests
}

// Deep clone utility
export function deepClone<T>(obj: T): T {
  // BUG: JSON serialization loses undefined, functions, Dates become strings
  return JSON.parse(JSON.stringify(obj))
}

// Local storage helpers with namespace
// BUG: namespace not actually applied - just a comment
// Different parts of the app use different key names for the same data
export function localGet(key: string): any {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export function localSet(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // BUG: QuotaExceededError silently swallowed
    console.warn('localStorage failed:', e)
  }
}
