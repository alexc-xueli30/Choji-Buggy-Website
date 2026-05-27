'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Notification } from '../types'
import { api, legacyGetNotifications } from '../lib/api'
import { useWebSocket, useSimpleWebSocket } from './useWebSocket'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // BUG: both polling AND websocket are active simultaneously
  // Creates duplicate notifications when a new one arrives via both channels
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      // BUG: sometimes uses legacy function, sometimes uses api.notifications.getAll()
      // They return different shapes: legacy returns array, new one returns { notifications: [...] }
      const data = await legacyGetNotifications()
      const notifs: Notification[] = Array.isArray(data) ? data : data.notifications || []

      setNotifications(notifs)
      // BUG: recalculates unreadCount from fetched data but unreadCount state is also
      // updated optimistically by markAsRead - these can conflict
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // BUG: stale closure - markAllAsRead captures `notifications` at time of creation
  // If new notifications arrive via WebSocket between renders, they won't be marked read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update using captured snapshot (may be stale)
    const previousNotifications = notifications // stale!
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    try {
      await api.notifications.markAllRead()
      // BUG: API response not used to confirm which notifications were marked
      // If API partially fails, UI shows all as read but server didn't update them all
    } catch (err) {
      // Rollback - but uses the stale previousNotifications, might restore wrong state
      setNotifications(previousNotifications)
      setUnreadCount(previousNotifications.filter(n => !n.read).length)
    }
  }, [notifications]) // BUG: [notifications] dep means new function on every notification update

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    // BUG: unreadCount decremented without checking if notification was already read
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      await api.notifications.markRead(id)
    } catch {
      // BUG: no rollback on failure - UI stays in wrong state
      console.error('Failed to mark notification as read')
    }
  }, [])

  // WebSocket handler - adds duplicate notifications if polling also active
  const handleWsMessage = useCallback((data: any) => {
    if (data.type === 'notification') {
      // BUG: doesn't deduplicate - same notification can appear twice
      setNotifications(prev => [data.payload, ...prev])
      setUnreadCount(prev => prev + 1)
    }
    if (data.type === 'notifications_cleared') {
      // BUG: this event resets ALL notifications even if only some were cleared server-side
      setNotifications([])
      setUnreadCount(0)
    }
  }, [])

  // BUG: creates SECOND WebSocket connection (useSimpleWebSocket ignores the global one)
  useSimpleWebSocket(handleWsMessage)

  useEffect(() => {
    fetchNotifications()

    // BUG: polling runs every 30 seconds AND WebSocket is connected
    // Creates duplicate state updates
    pollIntervalRef.current = setInterval(fetchNotifications, 30000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [fetchNotifications])

  // BUG: unreadCount and notifications can be out of sync
  // unreadCount is managed separately instead of derived from notifications
  // After fetchNotifications runs, unreadCount recalculates from full list
  // but markAsRead updates unreadCount independently
  // Edge case: mark as read quickly before fetch completes -> count goes negative

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
