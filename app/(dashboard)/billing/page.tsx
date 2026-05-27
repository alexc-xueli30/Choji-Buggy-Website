'use client'

import { useState } from 'react'
import { useBilling } from '../../../hooks/useBilling'
import { formatCurrency, formatDate } from '../../../lib/utils'
import toast from 'react-hot-toast'
import PlanCard from '../../../components/billing/PlanCard'

export default function BillingPage() {
  const { plans, subscription, currentPlan, isLoading, isUpgrading, error, upgradePlan, cancelSubscription } = useBilling()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)

  const handleUpgrade = async (planId: string) => {
    if (planId === subscription?.planId || planId === subscription?.plan_id) {
      toast.error('You are already on this plan')
      return
    }

    try {
      // BUG: no confirmation dialog before charging user
      // Just upgrades immediately on click
      await upgradePlan(planId)
      // BUG: success shown before payment actually confirmed (optimistic update bug)
      toast.success(`Upgraded to ${plans.find(p => p.id === planId)?.name || 'new plan'}!`)
    } catch (err: any) {
      toast.error(err.message || 'Upgrade failed')
    }
  }

  const handleCancel = async () => {
    setIsCanceling(true)
    try {
      await cancelSubscription()
      setShowCancelConfirm(false)
      toast.success('Subscription canceled. You\'ll have access until the end of your billing period.')
    } catch (err: any) {
      toast.error(err.message || 'Cancellation failed')
    } finally {
      setIsCanceling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 skeleton rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-64 skeleton rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription and payment details</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Current Plan Summary */}
      {subscription && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {currentPlan?.name || 'Unknown Plan'}
                  {/* BUG: currentPlan can be undefined if plan was deleted from PLANS array */}
                </span>
                <span className={`badge ${
                  subscription.status === 'active' ? 'badge-success' :
                  subscription.status === 'past_due' ? 'badge-danger' :
                  'badge-neutral'
                }`}>
                  {subscription.status}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="badge badge-warning">Canceling</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {/* BUG: currentPeriodEnd is a Unix timestamp but formatDate expects ISO string */}
                {/* This will display something like "Jan 1, 1970" for timestamp values */}
                Renews on {formatDate(subscription.currentPeriodEnd as any)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {/* BUG: currentPlan?.price might be in cents (29.99 * 100 = 2999) */}
                {formatCurrency(currentPlan?.price || 0)}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              <p className="text-xs text-gray-400">
                {subscription.usedSeats} / {subscription.seats} seats used
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === subscription?.planId || plan.id === subscription?.plan_id}
              isUpgrading={isUpgrading}
              onSelect={() => handleUpgrade(plan.id)}
            />
          ))}
          {/* BUG: if plans is empty (API failed), shows nothing - no empty state */}
        </div>
      </div>

      {/* Cancel subscription */}
      {subscription && subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Cancel Subscription</h2>
          <p className="text-sm text-gray-500 mb-4">
            Canceling will downgrade you to the free plan at the end of your billing period.
          </p>
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Cancel subscription
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-700">Are you sure?</p>
              <button
                onClick={handleCancel}
                disabled={isCanceling}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isCanceling ? 'Canceling...' : 'Yes, cancel'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-3 py-1.5 border border-gray-200 text-sm rounded-lg hover:bg-gray-50"
              >
                Keep subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payment method - placeholder */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Payment Method</h2>
        <div className="flex items-center gap-3">
          <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-gray-600">VISA</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</p>
            <p className="text-xs text-gray-500">Expires 12/2025</p>
          </div>
          <button className="ml-auto text-sm text-primary-500 hover:text-primary-600">
            Update
          </button>
          {/* BUG: "Update" button has no handler - onClick missing */}
        </div>
      </div>
    </div>
  )
}
