'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import NotificationBell from '../notifications/NotificationBell'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/search': 'Search',
  '/team': 'Team',
  '/upload': 'Files',
  '/notifications': 'Notifications',
  '/billing': 'Billing',
  '/settings': 'Settings',
}

export default function Header() {
  const pathname = usePathname()
  const { user } = useAuth()

  // BUG: title lookup uses exact match - won't work for /team/123 etc.
  const title = PAGE_TITLES[pathname || ''] || 'Choji'

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      <div className="flex items-center gap-4">
        <NotificationBell />
        {/* BUG: user.avatar_url might be null, falls back to initial */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: '#4f6ef7' }}
        >
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
