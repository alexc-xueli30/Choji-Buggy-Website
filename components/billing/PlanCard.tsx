'use client'

import { BillingPlan } from '../../types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  plan: BillingPlan
  isCurrent: boolean
  isUpgrading: boolean
  onSelect: () => void
}

export default function PlanCard({ plan, isCurrent, isUpgrading, onSelect }: Props) {
  const isPopular = plan.name === 'Pro'

  return (
    <div className={`bg-white rounded-xl border-2 p-5 relative transition-all ${
      isCurrent ? 'border-blue-500' :
      isPopular ? 'border-blue-200' :
      'border-gray-100 hover:border-gray-200'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-medium px-3 py-0.5 rounded-full">
          Most popular
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-medium px-3 py-0.5 rounded-full">
          Current plan
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
        <div className="mt-2">
          {/* BUG: price might be in cents (2999 = $29.99) or dollars (2999 = $2,999)
              formatCurrency treats as dollars, so Pro shows as $2,999.00/mo */}
          <span className="text-3xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
          <span className="text-gray-400 text-sm">/mo</span>
        </div>
      </div>

      <ul className="space-y-2 mb-5">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* BUG: plan.maxUsers is undefined because API sends max_users (snake_case) */}
      <p className="text-xs text-gray-400 mb-4">
        Up to {plan.maxUsers ?? (plan as any).max_users ?? '?'} users
      </p>

      <button
        onClick={onSelect}
        disabled={isCurrent || isUpgrading}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
          isCurrent
            ? 'bg-gray-100 text-gray-400 cursor-default'
            : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
        }`}
      >
        {isCurrent ? 'Current plan' : isUpgrading ? 'Upgrading...' : `Upgrade to ${plan.name}`}
      </button>
    </div>
  )
}
