'use client'

// BUG: This component maintains its own unread count state
// independently from the notifications page and hook.
// The two sources of truth can diverge: bell shows 3, page shows 1.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '../../hooks/useNotifications'

export default function NotificationBell() {
  const router = useRouter()
  const { unreadCount } = useNotifications()
  // BUG: local copy of unreadCount - initialized from hook but then managed separately
  const [localCount, setLocalCount] = useState(unreadCount)
  const [isAnimating, setIsAnimating] = useState(false)

  // BUG: only syncs localCount when hook's unreadCount changes
  // but if the user marks notifications read on the notifications page,
  // unreadCount in the hook updates but localCount here lags by one render cycle
  useEffect(() => {
    if (unreadCount > localCount) {
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 600)
    }
    setLocalCount(unreadCount)
  }, [unreadCount]) // BUG: localCount not in deps - stale comparison

  return (
    <button
      onClick={() => router.push('/notifications')}
      className="relative p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
    >
      <svg
        className={`w-5 h-5 ${isAnimating ? 'bell-shake' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {/* BUG: shows localCount which can be stale, not unreadCount directly */}
      {localCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
          {localCount > 9 ? '9+' : localCount}
        </span>
      )}
    </button>
  )
}
