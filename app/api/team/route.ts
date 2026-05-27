import { NextRequest, NextResponse } from 'next/server'

// BUG: in-memory state, resets on serverless cold start
let teamMembers = [
  {
    id: 'member_1',
    user_id: 'usr_1', // snake_case (inconsistent with User.id which is just 'id')
    email: 'admin@choji.io',
    name: 'Alex Chen',
    role: 'admin',
    invited_at: '2024-01-01T00:00:00Z',
    joined_at: '2024-01-01T00:00:00Z',
    status: 'active',
    avatar: null, // components expect string but this is null - TypeError in some components
  },
  {
    id: 'member_2',
    user_id: 'usr_2',
    email: 'member@choji.io',
    name: 'Sam Taylor',
    role: 'member',
    invited_at: '2024-01-15T00:00:00Z',
    joined_at: '2024-01-16T00:00:00Z',
    status: 'active',
    avatar: null,
  },
  {
    id: 'member_3',
    user_id: 'usr_3',
    email: 'viewer@choji.io',
    name: 'Jordan Lee',
    role: 'viewer', // BUG: 'viewer' not in TeamMember role type (only admin|member)
    invited_at: '2024-02-01T00:00:00Z',
    joined_at: null, // pending user, components don't handle null joined_at
    status: 'pending',
    avatar: null,
  },
]

// Track pending invites separately - TODO: merge with teamMembers
const pendingInvites: any[] = []

export async function GET(req: NextRequest) {
  // BUG: returns all members without filtering by team
  // In a multi-tenant app, this would expose all users' team members
  return NextResponse.json({
    members: teamMembers,
    pending: pendingInvites,
    total: teamMembers.length,
    // BUG: doesn't include pending in total count - frontend shows wrong number
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role required' }, { status: 400 })
  }

  // BUG: duplicate invite check uses simple equality but doesn't check pending invites
  const existingMember = teamMembers.find(m => m.email === email)
  if (existingMember) {
    return NextResponse.json({ error: 'User already a team member' }, { status: 409 })
  }

  // BUG: NO duplicate check for pending invites
  // User can receive multiple invite emails if invited multiple times
  // Race condition: two simultaneous POST requests can both pass the duplicate check
  // and create two invite records

  const invite = {
    id: `member_${Date.now()}`,
    user_id: null, // will be set when user accepts
    email,
    name: email.split('@')[0], // guess name from email - bad UX
    role,
    invited_at: new Date().toISOString(),
    joined_at: null,
    status: 'pending',
    avatar: null,
    invite_token: Math.random().toString(36).slice(2), // BUG: weak token
  }

  // BUG: adds to teamMembers instead of pendingInvites
  // GET returns both but different frontend code reads different arrays
  teamMembers.push(invite as any)

  // BUG: doesn't actually send email - would need Resend integration
  console.log(`[team] Would send invite email to ${email}`)

  return NextResponse.json({
    success: true,
    member: invite,
    // BUG: invite_token returned in response - security issue
  })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('id')
  const userId = searchParams.get('userId') // two different ways to specify the target

  if (!memberId && !userId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
  }

  const index = teamMembers.findIndex(
    m => m.id === memberId || m.user_id === userId
  )

  if (index === -1) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const [removed] = teamMembers.splice(index, 1)

  return NextResponse.json({ success: true, removed })
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get('id')
  const body = await req.json()

  const member = teamMembers.find(m => m.id === memberId)
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // BUG: no validation on role - can set to any string including invalid roles
  Object.assign(member, body)

  return NextResponse.json({ success: true, member })
}
