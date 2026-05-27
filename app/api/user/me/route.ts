import { NextRequest, NextResponse } from 'next/server'

// GET /api/user/me - newer endpoint used by validateSession
// BUG: duplicated from /api/user but with slightly different response shape
// This causes validateSession to work but legacyFetchUser to fail (or vice versa)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  // BUG: token not actually validated - just checked for presence
  // Any string starting with "Bearer " will succeed
  // TODO: CHOJI-301 - add proper JWT validation

  // BUG: returns { user: {...} } but GET /api/user returns { data: { user: {...} } }
  // validateSession in lib/auth.ts tries to handle both with: data.user || data.data?.user
  return NextResponse.json({
    user: {
      id: 'usr_1',
      userId: 'usr_1',
      email: 'admin@choji.io',
      name: 'Alex Chen',
      role: 'admin',
      plan: 'pro',
      teamId: 'team_1',
      created_at: '2024-01-01T00:00:00Z',
    }
  })
}
