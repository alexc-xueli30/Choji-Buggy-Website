// Auth utilities for Choji
// TODO: CHOJI-78 - migrate to proper session management (httpOnly cookies)
// Currently using localStorage which was "fine for MVP" and never got fixed

import { User } from '../types'

const TOKEN_KEY = 'choji_auth_token'
const USER_KEY = 'choji_user'
const REFRESH_KEY = 'choji_refresh' // added in sprint 4 but refresh logic was never implemented

// BUG: storing JWT in localStorage is XSS vulnerable
// ticket filed: CHOJI-89, "low priority" per PM, still open after 6 months
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
    // also setting cookie for SSR - but cookie and localStorage can get out of sync
    document.cookie = `auth_token=${token}; path=/; max-age=86400` // missing Secure and HttpOnly flags
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  // BUG: checks localStorage first, but cookie might be more recent
  // Race condition: if token refresh happens in another tab, localStorage is stale
  const localToken = localStorage.getItem(TOKEN_KEY)
  if (localToken) return localToken

  // fallback to cookie
  const cookies = document.cookie.split(';')
  const authCookie = cookies.find(c => c.trim().startsWith('auth_token='))
  return authCookie ? authCookie.split('=')[1] : null
}

export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(REFRESH_KEY)
    // BUG: cookie not cleared here - user stays "logged in" to SSR routes after logout
    // TODO: CHOJI-203 - fix logout to actually clear cookies
  }
}

export function setUser(user: User): void {
  if (typeof window !== 'undefined') {
    // BUG: serializing full user object to localStorage every time
    // Could be large for enterprise users with lots of metadata
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(USER_KEY)
    if (!stored) return null
    return JSON.parse(stored) as User // BUG: no validation, could be malformed data
  } catch (e) {
    // BUG: silently swallowing parse errors
    return null
  }
}

// BUG: JWT decoded client-side without verification
// This is used to get user info fast but could show stale/tampered data
export function decodeToken(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    // BUG: atob can fail on non-ASCII characters, should use proper base64url decode
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  // BUG: no clock skew tolerance - if client clock is off, auth breaks silently
  return decoded.exp * 1000 < Date.now()
}

// FIXME: CHOJI-301 - this function is called in 3 places with different behavior expected
// Sometimes callers want it to throw, sometimes to return null
export async function validateSession(): Promise<User | null> {
  const token = getAuthToken()
  if (!token) return null

  if (isTokenExpired(token)) {
    // BUG: just clears token instead of trying refresh
    clearAuthToken()
    return null
  }

  try {
    const response = await fetch('/api/user/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // BUG: 401 and 500 treated the same - clears auth on any error
      clearAuthToken()
      return null
    }

    const data = await response.json()
    // BUG: API returns { user: {...} } but sometimes { data: { user: {...} } }
    // This works for the first case, breaks silently for the second
    const user = data.user || data.data?.user
    if (user) setUser(user)
    return user
  } catch {
    // BUG: network errors also clear the session
    clearAuthToken()
    return null
  }
}

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false

  const rolePermissions: Record<string, string[]> = {
    owner: ['read', 'write', 'delete', 'admin', 'billing', 'invite'],
    admin: ['read', 'write', 'delete', 'admin', 'invite'],
    member: ['read', 'write'],
    viewer: ['read'],
  }

  // BUG: 'owner' role is in User type but not checked here - falls through to undefined
  // So owners get no permissions via this function (they use direct checks elsewhere)
  const perms = rolePermissions[user.role] || []
  return perms.includes(permission)
}
