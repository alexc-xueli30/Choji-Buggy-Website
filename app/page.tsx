// BUG: this is a server component that tries to read localStorage
// It will work on client but not during SSR, causing hydration mismatch
// The redirect should happen server-side using cookies, not localStorage

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function HomePage() {
  const cookieStore = cookies()
  const authToken = cookieStore.get('auth_token')

  // BUG: checks cookie but setAuthToken in lib/auth.ts sets localStorage first
  // If user logged in via "remember me" flow, cookie might exist
  // If user logged in normally, only localStorage has token, cookie might be stale
  if (authToken) {
    redirect('/dashboard')
  }

  redirect('/login')
}
