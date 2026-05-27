'use client'

// Dashboard layout - wraps all authenticated pages
// BUG: auth check happens client-side - server renders the layout briefly before redirect
// This causes a flash of the dashboard for unauthenticated users (bad for security perception)

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'
import Sidebar from '../../components/layout/Sidebar'
import Header from '../../components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // BUG: shows full dashboard layout while auth check is in progress
  // User briefly sees the layout shell before the loading state kicks in
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // BUG: renders dashboard content for a frame even when not authenticated
  // before the useEffect redirect fires
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {/* BUG: children receive no auth context - each page does its own auth check */}
          {children}
        </main>
      </div>
    </div>
  )
}
