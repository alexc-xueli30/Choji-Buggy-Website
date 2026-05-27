'use client'

import { Notification } from '../../types'
import { formatRelativeTime } from '../../lib/utils'

interface Props {
  notifications: Notification[]
  onMarkRead: (id: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  error: 'bg-red-100 text-red-600',
  // BUG: 'alert' type from API not handled here - falls through to undefined, no color applied
}

export default function NotificationList({ notifications, onMarkRead }: Props) {
  return (
    <div className="divide-y divide-gray-50">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`flex gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
            !notif.read ? 'bg-blue-50/30' : ''
          }`}
          onClick={() => {
            if (!notif.read) onMarkRead(notif.id)
            // BUG: 'link' field exists on API notifications but not in the Notification type
            // So navigating to the notification target never works
            // const link = (notif as any).link
            // if (link) router.push(link)
          }}
        >
          {/* Type indicator dot */}
          <div className="flex-shrink-0 mt-0.5">
            <span className={`inline-block w-2 h-2 rounded-full ${
              !notif.read ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            {notif.title && (
              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
            )}
            <p className="text-sm text-gray-600">{notif.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {/* BUG: notif.createdAt is camelCase but API sends created_at (snake_case)
                  so this is always undefined, formatRelativeTime returns 'just now' */}
              {formatRelativeTime(notif.createdAt || (notif as any).created_at)}
            </p>
          </div>
          {!notif.read && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead(notif.id)
              }}
              className="text-xs text-blue-500 hover:text-blue-600 flex-shrink-0 self-start mt-0.5"
            >
              Mark read
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
