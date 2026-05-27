import { NextRequest, NextResponse } from 'next/server'
import { sign } from 'jsonwebtoken'

// Mock user database - TODO: CHOJI-5 replace with real DB
const MOCK_USERS = [
  { id: 'usr_1', userId: 'usr_1', email: 'admin@choji.io', password: 'password123', name: 'Alex Chen', role: 'admin', plan: 'pro', teamId: 'team_1' },
  { id: 'usr_2', userId: 'usr_2', email: 'member@choji.io', password: 'password123', name: 'Sam Taylor', role: 'member', plan: 'pro', teamId: 'team_1' },
  { id: 'usr_3', userId: 'usr_3', email: 'viewer@choji.io', password: 'password123', name: 'Jordan Lee', role: 'viewer', plan: 'free', teamId: 'team_1' },
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 })
    }

    // BUG: plain text password comparison - should use bcrypt
    // bcryptjs is in package.json but never used here
    const user = MOCK_USERS.find(u => u.email === email && u.password === password)

    if (!user) {
      // BUG: same error for "user not found" and "wrong password" - allows email enumeration?
      // Actually this is intentionally vague for security, but the bug is the inconsistency
      // with signup which reveals if email exists
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }

    const secret = process.env.JWT_SECRET || 'fallback-secret-bad'
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '24h' }
    )

    return NextResponse.json({
      user_id: user.id,
      access_token: token,
      user: {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
        teamId: user.teamId,
        created_at: new Date().toISOString(),
      },
      // BUG: expiresIn not returned - frontend can't know when to refresh
    })
  } catch (err: any) {
    // BUG: full error message returned to client - could leak implementation details
    return NextResponse.json({ message: err.message }, { status: 500 })
  }
}
