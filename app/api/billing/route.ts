import { NextRequest, NextResponse } from 'next/server'

const PLANS = [
  {
    id: 'plan_free',
    name: 'Free',
    price: 0,
    priceYearly: 0,
    features: ['Up to 3 users', '1 GB storage', 'Basic features'],
    max_users: 3, // BUG: snake_case here but frontend type uses maxUsers
    maxStorage: 1073741824, // 1 GB in bytes
    maxProjects: 3,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    price: 2999, // BUG: is this cents ($29.99) or dollars ($2999)? frontend treats it as dollars
    priceYearly: 28799,
    features: ['Up to 20 users', '50 GB storage', 'Advanced features', 'Priority support'],
    max_users: 20,
    maxStorage: 53687091200, // 50 GB
    maxProjects: 50,
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    price: 9999,
    priceYearly: 99999,
    features: ['Unlimited users', '1 TB storage', 'All features', 'Dedicated support', 'SLA'],
    max_users: 999999,
    maxStorage: 1099511627776, // 1 TB
    maxProjects: 999999,
  },
]

// Mock subscription
let currentSubscription = {
  id: 'sub_1',
  planId: 'plan_pro',
  plan_id: 'plan_pro', // both versions because different code uses different fields
  status: 'active',
  currentPeriodEnd: 1735689600, // BUG: Unix timestamp (number) but frontend type expects string
  cancelAtPeriodEnd: false,
  seats: 5,
  usedSeats: 2,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const resource = searchParams.get('resource')

  if (resource === 'plans') {
    return NextResponse.json({ plans: PLANS })
  }

  if (resource === 'subscription') {
    return NextResponse.json({ subscription: currentSubscription })
  }

  if (resource === 'invoices') {
    return NextResponse.json({
      invoices: [
        { id: 'inv_1', amount: 2999, date: '2024-01-01', status: 'paid' },
        { id: 'inv_2', amount: 2999, date: '2024-02-01', status: 'paid' },
      ]
    })
  }

  // BUG: default returns subscription, but route structure is inconsistent
  // /billing/plans, /billing/subscription should be separate routes
  // instead everything goes through this one route with query params
  return NextResponse.json({ subscription: currentSubscription })
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'upgrade') {
    const body = await req.json()
    const { planId } = body

    const plan = PLANS.find(p => p.id === planId)
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // BUG: returns 200 immediately without processing payment
    // In a real app this would charge the card, but here we just update state
    // Frontend shows "Upgraded!" before any payment validation
    currentSubscription = {
      ...currentSubscription,
      planId,
      plan_id: planId,
      status: 'active',
    }

    // Simulate occasional payment failure (10% of the time)
    // BUG: but we already returned 200... this code is unreachable
    if (Math.random() < 0.1) {
      // This never actually fails the request
      console.error('[billing] Payment processing failed silently')
    }

    return NextResponse.json({
      success: true,
      subscription: currentSubscription,
      message: `Upgraded to ${plan.name}`,
      // BUG: doesn't return updated plan details, frontend optimistic update uses stale data
    })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  currentSubscription = {
    ...currentSubscription,
    cancelAtPeriodEnd: true,
    status: 'active', // still active until period end
  }

  return NextResponse.json({
    success: true,
    subscription: currentSubscription,
  })
}
