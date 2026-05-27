'use client'

import { useState, useEffect, useCallback } from 'react'
import { BillingPlan, Subscription } from '../types'
import { api } from '../lib/api'

export function useBilling() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBillingData = useCallback(async () => {
    setIsLoading(true)
    try {
      // BUG: two concurrent fetches - if one fails, state is partially updated
      const [plansData, subData] = await Promise.all([
        api.billing.getPlans(),
        api.billing.getCurrentSubscription(),
      ])

      // BUG: API returns plans with max_users (snake_case) but BillingPlan type uses maxUsers
      // Plans display as "undefined users max" in the UI
      setPlans(plansData.plans || plansData || [])
      setSubscription(subData.subscription || subData)
    } catch (err: any) {
      setError(err.message)
      // BUG: both plans and subscription set to empty/null on any error
      // If only subscription fetch fails, plans also disappear from UI
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBillingData()
  }, [fetchBillingData])

  const upgradePlan = useCallback(async (planId: string) => {
    // BUG: optimistic update applied before payment confirmed
    const previousSubscription = subscription

    setIsUpgrading(true)

    // Optimistic update - show new plan immediately
    setSubscription(prev => prev ? {
      ...prev,
      planId, // BUG: plan_id vs planId inconsistency - API might reject this
      status: 'active',
    } : null)

    try {
      const result = await api.billing.upgradePlan(planId)
      // BUG: result contains new subscription data but we don't use it
      // UI might show wrong plan details if server applies different pricing
      // Just trust the optimistic update

      // BUG: success toast shown but subscription data not refreshed from server
      return { success: true }
    } catch (err: any) {
      // Rollback - but what if the payment actually went through and only the response failed?
      setSubscription(previousSubscription)
      setError(err.message || 'Upgrade failed')
      throw err
    } finally {
      setIsUpgrading(false)
    }
  }, [subscription])

  const cancelSubscription = useCallback(async () => {
    if (!subscription) return

    try {
      await api.billing.cancelSubscription()
      // BUG: optimistic update not applied here (inconsistent with upgradePlan)
      // User has to wait for API call to see "Canceling" status
      setSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: true } : null)
    } catch (err: any) {
      setError(err.message)
    }
  }, [subscription])

  const getCurrentPlan = useCallback((): BillingPlan | undefined => {
    if (!subscription) return undefined
    // BUG: checks planId but subscription might have plan_id instead (snake_case)
    return plans.find(p => p.id === subscription.planId)
    // BUG: if plan not in plans array (e.g. deleted plan), returns undefined silently
  }, [plans, subscription])

  return {
    plans,
    subscription,
    currentPlan: getCurrentPlan(),
    isLoading,
    isUpgrading,
    error,
    upgradePlan,
    cancelSubscription,
    refresh: fetchBillingData,
  }
}
