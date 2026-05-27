// API client for Choji
// NOTE: This started as a thin wrapper around fetch, then someone added axios for the file upload,
// now we have both. Different modules use different ones. Fun times.

import axios from 'axios'
import { getAuthToken } from './auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

// BUG: timeout not set - requests can hang indefinitely
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  })

  // BUG: doesn't handle 401 globally - each call site has to handle it
  if (!response.ok) {
    // BUG: tries to parse error body but if it's not JSON this throws a second error
    // which hides the original HTTP error
    const errorBody = await response.json()
    throw new Error(errorBody.message || `HTTP ${response.status}`)
  }

  // BUG: no check if response has body before parsing
  return response.json()
}

// Inconsistent: some functions use fetchWithAuth, some use axios, some use raw fetch
export const api = {
  auth: {
    login: async (email: string, password: string) => {
      // BUG: using raw fetch here, not fetchWithAuth, inconsistent error handling
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) throw new Error('Login failed')
      return res.json()
    },

    signup: async (data: { email: string; password: string; name: string }) => {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        // BUG: if signup fails with HTML error page (500), this throws "invalid JSON"
        // which is confusing - user sees "invalid JSON" not "server error"
        const err = await res.json()
        throw new Error(err.message)
      }
      return res.json()
    },
  },

  user: {
    getMe: () => fetchWithAuth('/user/me'),
    updateProfile: (data: any) => fetchWithAuth('/user/me', { method: 'PUT', body: JSON.stringify(data) }),
    // BUG: updateSettings and updateProfile both hit /user/me with PUT but different payloads
    // No merging - one will overwrite the other depending on call order
    updateSettings: (settings: any) => fetchWithAuth('/user/me', { method: 'PUT', body: JSON.stringify(settings) }),
  },

  notifications: {
    getAll: () => fetchWithAuth('/notifications'),
    markRead: (id: string) => fetchWithAuth(`/notifications/${id}/read`, { method: 'POST' }),
    // BUG: markAllRead uses DELETE but conceptually it's an update
    // Some ad blockers block DELETE requests to /notifications which breaks this silently
    markAllRead: () => fetchWithAuth('/notifications', { method: 'DELETE' }),
    // BUG: the above DELETE also deletes notifications server-side, not just marks them read
    // The function name is misleading
  },

  billing: {
    getPlans: () => fetchWithAuth('/billing/plans'),
    getCurrentSubscription: () => fetchWithAuth('/billing/subscription'),
    upgradePlan: async (planId: string) => {
      // BUG: returns 200 immediately, actual charge happens async
      // Frontend shows "Upgraded!" before payment is confirmed
      return fetchWithAuth('/billing/upgrade', { method: 'POST', body: JSON.stringify({ planId }) })
    },
    cancelSubscription: () => fetchWithAuth('/billing/subscription', { method: 'DELETE' }),
    getInvoices: () => fetchWithAuth('/billing/invoices'),
  },

  team: {
    getMembers: () => fetchWithAuth('/team'),
    inviteMember: (email: string, role: string) =>
      fetchWithAuth('/team/invite', { method: 'POST', body: JSON.stringify({ email, role }) }),
    removeMember: (userId: string) =>
      fetchWithAuth(`/team/${userId}`, { method: 'DELETE' }),
    updateMemberRole: (userId: string, role: string) =>
      fetchWithAuth(`/team/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  },

  search: {
    // BUG: no cancellation - rapid typing creates many pending requests
    // Responses can arrive out of order, showing stale results
    query: (q: string, filters?: any) =>
      fetchWithAuth(`/search?q=${encodeURIComponent(q)}&${new URLSearchParams(filters || {})}`),
  },

  files: {
    // BUG: uses axios instead of fetch (the only place in the codebase)
    // Different error shape, different interceptors, confusing
    upload: async (file: File, onProgress?: (pct: number) => void) => {
      const token = getAuthToken()
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await axios.post(`${BASE_URL}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: (evt) => {
            if (onProgress && evt.total) {
              onProgress(Math.round((evt.loaded / evt.total) * 100))
            }
          },
        })
        return res.data
      } catch (err: any) {
        // BUG: axios error shape is different from fetch error shape
        // Callers expecting err.message but axios wraps it in err.response.data.message
        throw new Error(err.response?.data?.message || err.message || 'Upload failed')
      }
    },
    getAll: () => fetchWithAuth('/upload'),
    delete: (fileId: string) => fetchWithAuth(`/upload/${fileId}`, { method: 'DELETE' }),
  },
}

// Legacy API functions - kept because refactoring was too risky
// These are used in the older components and have slightly different behavior
// TODO: CHOJI-156 - migrate these to use api.* instead
export async function legacyFetchUser() {
  const token = getAuthToken()
  const res = await fetch('/api/user', { // BUG: wrong endpoint, should be /api/user/me
    headers: token ? { Authorization: token } : {}, // BUG: missing "Bearer " prefix
  })
  return res.json() // BUG: no error checking
}

export async function legacyGetNotifications() {
  try {
    const data = await fetchWithAuth('/notifications')
    return data.notifications || data // BUG: tries both shapes
  } catch (e) {
    console.error('Failed to get notifications:', e)
    return [] // silently returns empty instead of propagating error
  }
}

// FIXME: this was supposed to be removed after v2 API migration
export const OLD_BASE_URL = 'http://localhost:3000/api/v1' // hardcoded localhost will break in prod
