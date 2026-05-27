'use client'

import { Activity } from '../../types'
import { formatRelativeTime } from '../../lib/utils'

interface Props {
  activities: Activity[]
  isLoading: boolean
}

export default function ActivityFeed({ activities, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="p-5 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="w-7 h-7 skeleton rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!activities.length) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">
        No recent activity
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {activities.map(activity => (
        <div key={activity.id} className="flex gap-3 p-4">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: '#4f6ef7' }}
          >
            {activity.actor?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{activity.actor?.name}</span>
              {' '}{activity.action}{' '}
              {activity.target && <span className="font-medium">{activity.target}</span>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {/* BUG: timestamp can be string or number - formatRelativeTime handles both
                  but the number branch interprets as milliseconds, while API sends seconds */}
              {formatRelativeTime(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
