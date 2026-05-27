'use client'

// Main dashboard page
// TODO: CHOJI-156 - this component is 400+ lines and does too much, split it up

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useWebSocket } from '../../../hooks/useWebSocket'
import { formatRelativeTime, formatDate, formatCurrency } from '../../../lib/utils'
import { DashboardStats, Activity } from '../../../types'
import StatsCard from '../../../components/dashboard/StatsCard'
import ActivityFeed from '../../../components/dashboard/ActivityFeed'

// Hardcoded mock stats - TODO: fetch from real API
const MOCK_STATS: DashboardStats = {
  totalProjects: 12,
  activeMembers: 7,
  storageUsed: 15728640000, // bytes
  storageLimit: 53687091200,
  recentActivity: [],
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActivityLoading, setIsActivityLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // BUG: two separate loading states that can get out of sync
  // isLoading and isActivityLoading are set independently
  // The "loading" spinner only watches isLoading, so activity can be loading without indicator

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    try {
      // BUG: fetching from /api/user/me but expecting dashboard stats
      // This endpoint doesn't return stats - it returns user profile
      // So stats always shows as empty and MOCK_STATS is used as fallback
      const response = await fetch('/api/user/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('choji_auth_token')}` }
      })

      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()

      // BUG: data.stats doesn't exist on /api/user/me response
      // falls back to MOCK_STATS - dashboard always shows hardcoded data
      setStats(data.stats || MOCK_STATS)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message)
      setStats(MOCK_STATS) // silently falls back without telling user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchActivity = useCallback(async () => {
    setIsActivityLoading(true)
    try {
      // BUG: /api/activity endpoint doesn't exist
      const res = await fetch('/api/activity')
      if (!res.ok) throw new Error('Failed to fetch activity')
      const data = await res.json()
      setActivity(data.activity || data || [])
    } catch {
      // BUG: silently fails - user sees empty activity feed with no error
      setActivity(MOCK_ACTIVITY)
    } finally {
      setIsActivityLoading(false)
    }
  }, [])

  // BUG: two competing useEffects both set isLoading state
  // Effect 1: sets isLoading true, fetches stats, sets false
  // Effect 2: also manages loading-related side effects
  // Race condition: if fetchActivity resolves before fetchStats, isLoading is set false
  // but we might still be fetching stats
  useEffect(() => {
    fetchStats()
    fetchActivity()
  }, [fetchStats, fetchActivity])

  // BUG: this effect fires when user changes, but user is from useAuth
  // which also fires on load - causing double fetch on initial render
  useEffect(() => {
    if (user) {
      // Re-fetch when user changes (e.g. after profile update)
      // But this fires on every render where user object reference changes
      fetchStats()
    }
  }, [user, fetchStats]) // BUG: user reference changes every auth check cycle

  // WebSocket for real-time dashboard updates
  const handleWsMessage = useCallback((data: any) => {
    if (data.type === 'activity') {
      // BUG: prepends to activity but doesn't deduplicate
      setActivity(prev => [data.payload, ...prev.slice(0, 19)])
    }
    if (data.type === 'stats_update') {
      // BUG: partial stats update overwrites entire stats object
      setStats(data.payload)
    }
  }, [])

  useWebSocket(handleWsMessage, { room: 'dashboard' })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
      </div>
    )
  }

  const storagePercent = stats
    ? Math.round((stats.storageUsed / stats.storageLimit) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* BUG: uses user.name but user could be null - crashes if user is null */}
          <h1 className="text-2xl font-bold text-gray-900">
            Good morning, {user?.name?.split(' ')[0]} 👋
            {/* BUG: uses emoji despite instruction not to - hardcoded in JSX */}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {lastUpdated ? `Updated ${formatRelativeTime(lastUpdated)}` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
          Some data may be outdated. {error}
          {/* BUG: shows error but also shows data - user might not know data is stale */}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Projects"
          value={stats?.totalProjects ?? 0}
          change={+12}
          changeLabel="vs last month"
          icon="projects"
        />
        <StatsCard
          title="Active Members"
          value={stats?.activeMembers ?? 0}
          change={+3}
          changeLabel="this week"
          icon="members"
        />
        <StatsCard
          title="Storage Used"
          // BUG: formatFileSize not imported - will throw ReferenceError
          // Instead using inline calculation that has its own bugs
          value={`${Math.round(storagePercent)}%`}
          change={storagePercent > 80 ? -1 : +1} // misleading negative for high usage
          changeLabel="of 50 GB"
          icon="storage"
          // BUG: change prop value is -1 to indicate "bad" but component shows it as "-1%"
        />
        <StatsCard
          title="Monthly Spend"
          value={formatCurrency(29.99)} // BUG: hardcoded, not from billing API
          change={0}
          changeLabel="no change"
          icon="billing"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <QuickAction label="Invite teammate" href="/team" />
        <QuickAction label="Upload file" href="/upload" />
        <QuickAction label="View billing" href="/billing" />
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          {isActivityLoading && (
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <ActivityFeed
          activities={activity}
          isLoading={isActivityLoading}
        />
      </div>
    </div>
  )
}

// QuickAction - inline component, should be extracted (TODO: CHOJI-167)
function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="bg-white border border-gray-100 rounded-xl p-4 text-sm font-medium text-gray-700 hover:border-primary-200 hover:text-primary-600 transition-colors shadow-sm text-center"
    >
      {label}
    </a>
  )
}

// Mock activity data - this shouldn't be in the page component
// TODO: move to a fixture file or seed data
const MOCK_ACTIVITY: Activity[] = [
  {
    id: 'act_1',
    action: 'uploaded',
    actor: { id: 'usr_1', userId: 'usr_1', email: 'admin@choji.io', name: 'Alex Chen', role: 'admin', plan: 'pro', teamId: 'team_1', created_at: '2024-01-01T00:00:00Z' },
    target: 'Q4 Report.pdf',
    timestamp: Date.now() - 1800000,
    metadata: {},
  },
  {
    id: 'act_2',
    action: 'invited',
    actor: { id: 'usr_1', userId: 'usr_1', email: 'admin@choji.io', name: 'Alex Chen', role: 'admin', plan: 'pro', teamId: 'team_1', created_at: '2024-01-01T00:00:00Z' },
    target: 'Jordan Lee',
    timestamp: Date.now() - 7200000,
    metadata: {},
  },
  {
    id: 'act_3',
    action: 'upgraded',
    actor: { id: 'usr_2', userId: 'usr_2', email: 'member@choji.io', name: 'Sam Taylor', role: 'member', plan: 'pro', teamId: 'team_1', created_at: '2024-01-01T00:00:00Z' },
    target: 'Pro plan',
    timestamp: '2024-02-01T10:00:00Z', // BUG: string here but other activities use number
    metadata: {},
  },
]
