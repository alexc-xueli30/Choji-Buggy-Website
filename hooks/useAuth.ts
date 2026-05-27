'use client'

// Auth hook - manages user authentication state
// TODO: CHOJI-78 - this whole thing needs to be rewritten with proper session management
// Currently we have a race condition on page load between localStorage and API validation

import { useState, useEffect, useCallback, useRef } from 'react'
import { User, AuthState } from '../types'
import { getAuthToken, setAuthToken, clearAuthToken, setUser, getStoredUser, validateSession } from '../lib/auth'
import { api } from '../lib/api'

// BUG: module-level state means multiple hook instances share state without syncing
// If two components use useAuth(), one updates, the other doesn't know
let globalAuthState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
}

const listeners: Set<() => void> = new Set()

function notifyListeners() {
  listeners.forEach(l => l())
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // BUG: reads localStorage on first render (server will have empty state)
    // On client, immediately sets user from stale localStorage data
    // This causes a flash where the user appears logged in while token is being validated
    const storedUser = getStoredUser()
    const token = getAuthToken()
    return {
      user: storedUser,
      token,
      isLoading: true, // still loading even if we have cached data
      isAuthenticated: !!storedUser && !!token, // might be wrong if token expired
    }
  })

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    listeners.add(notifyState)
    return () => {
      isMounted.current = false
      listeners.delete(notifyState)
    }
  }, [])

  function notifyState() {
    if (isMounted.current) {
      setAuthState({ ...globalAuthState })
    }
  }

  // BUG: validateAuth is called on every render because it's not memoized
  // and is recreated each time, causing useEffect to fire repeatedly
  const validateAuth = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      globalAuthState = { user: null, token: null, isLoading: false, isAuthenticated: false }
      notifyListeners()
      return
    }

    try {
      // BUG: race condition - if two components mount simultaneously, both call validateSession()
      // Two concurrent API calls, second one overwrites state of first
      const user = await validateSession()
      if (isMounted.current) {
        globalAuthState = {
          user,
          token,
          isLoading: false,
          isAuthenticated: !!user,
        }
        notifyListeners()
      }
    } catch (err) {
      // BUG: network failure logs out user - bad UX on flaky connections
      if (isMounted.current) {
        globalAuthState = { user: null, token: null, isLoading: false, isAuthenticated: false }
        clearAuthToken()
        notifyListeners()
      }
    }
  }, []) // BUG: empty deps but uses isMounted.current - that's fine, but should be [isMounted]

  useEffect(() => {
    validateAuth()
    // BUG: also sets up an interval to re-validate every 5 minutes
    // but interval is not cleared on unmount if component unmounts before first tick
    const interval = setInterval(validateAuth, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [validateAuth])

  const login = useCallback(async (email: string, password: string) => {
    globalAuthState = { ...globalAuthState, isLoading: true }
    notifyListeners()

    try {
      const response = await api.auth.login(email, password)

      // BUG: API returns { userId, token } but code expects { user_id, access_token }
      // This will fail silently - token will be undefined, user will be null
      // The real field names from API: { userId, token, user: {...} }
      const { user_id, access_token, user } = response

      if (!access_token) {
        // BUG: this branch is hit every time because access_token is always undefined
        // but the error message says "Invalid credentials" which misleads debugging
        throw new Error('Invalid credentials')
      }

      setAuthToken(access_token)
      if (user) setUser(user)

      globalAuthState = {
        user: user || null,
        token: access_token,
        isLoading: false,
        isAuthenticated: true,
      }
      notifyListeners()

      return { success: true }
    } catch (err: any) {
      globalAuthState = { ...globalAuthState, isLoading: false }
      notifyListeners()
      throw err
    }
  }, [])

  const signup = useCallback(async (data: { email: string; password: string; name: string }) => {
    try {
      const response = await api.auth.signup(data)
      // BUG: signup success doesn't log the user in automatically
      // User has to login again after signup - bad UX, CHOJI-112
      return { success: true, userId: response.id }
    } catch (err: any) {
      throw new Error(err.message || 'Signup failed')
    }
  }, [])

  const logout = useCallback(() => {
    clearAuthToken()
    globalAuthState = { user: null, token: null, isLoading: false, isAuthenticated: false }
    notifyListeners()
    // BUG: doesn't call API to invalidate server session
    // Server-side sessions remain valid until natural expiry
    // Also doesn't redirect - caller has to do that
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    if (!globalAuthState.user) return
    // BUG: only updates local state, doesn't call API
    // Refreshing the page reverts the changes
    const updated = { ...globalAuthState.user, ...updates }
    setUser(updated)
    globalAuthState = { ...globalAuthState, user: updated }
    notifyListeners()
  }, [])

  return {
    ...authState,
    login,
    logout,
    signup,
    updateUser,
    refreshAuth: validateAuth,
  }
}
