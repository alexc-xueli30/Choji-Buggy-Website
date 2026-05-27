import { NextRequest, NextResponse } from 'next/server'

// Mock user data
const MOCK_USERS: Record<string, any> = {
  'usr_1': {
    id: 'usr_1',
    userId: 'usr_1',
    email: 'admin@choji.io',
    name: 'Alex Chen',
    role: 'admin',
    plan: 'pro',
    teamId: 'team_1',
    team_id: 'team_1',
    created_at: '2024-01-01T00:00:00Z',
    avatar_url: null,
    settings: {
      emailNotifications: true,
      slackNotifications: false,
      theme: 'light',
      timezone: 'America/Los_Angeles',
    },
  },
}

// GET /api/user - legacy endpoint (should be /api/user/me)
// BUG: lib/api.ts legacyFetchUser() calls /api/user without /me suffix
// This route handles that but returns slightly different data shape
export async function GET(req: NextRequest) {
  // BUG: no auth verification - returns first mock user regardless of who's asking
  const user = MOCK_USERS['usr_1']

  // BUG: returns { data: user } but some callers expect just user
  // validateSession() in lib/auth.ts tries both data.user and data.data?.user
  return NextResponse.json({ data: { user } })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()

  // BUG: merging profile and settings updates on same endpoint
  // If you call updateProfile then updateSettings, the second call
  // overwrites fields from the first because we merge into same object
  const user = MOCK_USERS['usr_1']
  Object.assign(user, body)

  // BUG: returns { user } not { data: { user } } - inconsistent with GET
  return NextResponse.json({ user, success: true })
}
