import { NextRequest, NextResponse } from 'next/server'

// Mock notifications - in a real app this would be per-user from DB
// BUG: no user filtering - all users see all notifications
const MOCK_NOTIFICATIONS = [
  {
    id: 'notif_1',
    type: 'info',
    message: 'Sam Taylor joined your team',
    title: 'New Team Member',
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(), // API uses snake_case
    userId: 'usr_1',
  },
  {
    id: 'notif_2',
    type: 'alert', // BUG: 'alert' not 'error' - mismatches the frontend type
    message: 'Storage usage is above 80%',
    title: 'Storage Warning',
    read: false,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    userId: 'usr_1',
    link: '/settings', // BUG: 'link' field not in Notification type - gets silently dropped
  },
  {
    id: 'notif_3',
    type: 'success',
    message: 'Your plan was upgraded to Pro',
    title: 'Plan Upgraded',
    read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    userId: 'usr_1',
  },
]

// BUG: mutations on module-level state work across requests but reset on cold start
let notifications = [...MOCK_NOTIFICATIONS]

export async function GET(req: NextRequest) {
  // BUG: no auth verification on this endpoint
  // TODO: CHOJI-301 - add auth middleware to all API routes

  // Simulate occasional slow response (async timing issue)
  // BUG: this artificial delay causes race conditions with polling
  if (Math.random() < 0.1) {
    await new Promise(r => setTimeout(r, 2000))
  }

  // BUG: returns different shape than the POST endpoint
  // GET returns { notifications: [...] }
  // POST (add notification) returns notification object directly
  return NextResponse.json({
    notifications,
    unread: notifications.filter(n => !n.read).length,
    // BUG: total count not returned, frontend assumes total === notifications.length
  })
}

export async function DELETE(req: NextRequest) {
  // BUG: DELETE /notifications actually DELETES them instead of marking as read
  // Function in api.ts is called markAllRead but this actually removes them
  // Frontend will show empty list after "mark all read" instead of all showing as read
  notifications = []

  return NextResponse.json({
    success: true,
    message: 'All notifications cleared', // says "cleared" not "marked as read"
  })
}

// Individual notification read
// BUG: This route is at /notifications but the individual route should be /notifications/[id]
// Using query param instead of path segment - inconsistent with team endpoint
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const action = searchParams.get('action')

  if (!id) {
    return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
  }

  const notification = notifications.find(n => n.id === id)
  if (!notification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (action === 'read') {
    notification.read = true
    return NextResponse.json(notification)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
