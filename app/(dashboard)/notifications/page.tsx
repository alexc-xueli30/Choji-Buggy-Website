'use client'

import { useState } from 'react'
import { useNotifications } from '../../../hooks/useNotifications'
import NotificationList from '../../../components/notifications/NotificationList'
import { formatRelativeTime } from '../../../lib/utils'

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications()

  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    try {
      await markAllAsRead()
      // BUG: toast would be helpful here but not shown
      // User gets no feedback that action completed
    } catch {
      // BUG: silent failure - user doesn't know it failed
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {/* BUG: unreadCount can be out of sync with filteredNotifications.filter(!read).length */}
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="text-sm text-primary-500 hover:text-primary-600 disabled:opacity-50"
            >
              {isMarkingAll ? 'Marking...' : 'Mark all as read'}
            </button>
          )}
          <button
            onClick={refresh}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'unread'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'all' ? 'All' : `Unread (${unreadCount})`}
            {/* BUG: unreadCount in tab label might not match actual filtered count */}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          Failed to load notifications: {error}
        </div>
      )}

      {/* Notifications list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 flex gap-3">
                <div className="w-8 h-8 skeleton rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 skeleton rounded w-3/4" />
                  <div className="h-3 skeleton rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <NotificationList
            notifications={filteredNotifications}
            onMarkRead={markAsRead}
          />
        )}
      </div>

      {/* Debug info - should not be in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-500 font-mono">
          {/* BUG: process.env.NODE_ENV is 'development' in Next.js dev mode
              but this block still renders in production builds because Next.js
              doesn't tree-shake based on env checks in all cases */}
          notifications: {notifications.length} | unreadCount: {unreadCount} | filter: {filter}
        </div>
      )}
    </div>
  )
}
