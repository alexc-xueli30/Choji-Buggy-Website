import { NextRequest, NextResponse } from 'next/server'

// In-memory user store (would be DB in real app)
// BUG: shared in-memory state doesn't persist across serverless function invocations
// Every cold start resets users - signups are lost between deployments
const users: any[] = []

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, teamName } = body

    // BUG: validation returns different error formats than login endpoint
    if (!email || !password || !name) {
      return NextResponse.json({
        error: 'Missing required fields', // 'error' not 'message' (inconsistent)
        fields: { email: !email, password: !password, name: !name }
      }, { status: 422 })
    }

    // BUG: reveals if email exists - login doesn't, inconsistent security
    const exists = users.some(u => u.email === email)
    if (exists) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password too short' }, { status: 400 })
    }

    // BUG: password stored in plaintext
    const newUser = {
      id: `usr_${Date.now()}`, // BUG: collision possible if two signups at same millisecond
      email,
      password, // plaintext!
      name,
      role: 'owner', // BUG: first user should be owner, but ALL signups get owner role
      plan: 'free',
      teamId: `team_${Date.now()}`, // same collision risk
      teamName: teamName || `${name}'s Team`,
      created_at: new Date().toISOString(),
    }

    users.push(newUser)

    // BUG: doesn't send verification email
    // BUG: doesn't log user in after signup - they must go to login page
    return NextResponse.json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      message: 'Account created successfully',
      // Note: no token returned here, but login returns token
      // Inconsistency means frontend can't auto-login after signup
    }, { status: 201 })
  } catch (err: any) {
    console.error('[signup]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
