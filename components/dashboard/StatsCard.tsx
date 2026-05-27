'use client'

interface Props {
  title: string
  value: string | number
  change: number
  changeLabel: string
  icon: string
}

export default function StatsCard({ title, value, change, changeLabel, icon }: Props) {
  const isPositive = change > 0
  const isNegative = change < 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <div className="flex items-center gap-1 mt-2">
        {/* BUG: change=-1 shows "-1%" which is confusing for the storage card
            where -1 is used to signal "warning" not an actual percentage change */}
        <span className={`text-xs font-medium ${
          isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-gray-400'
        }`}>
          {change !== 0 ? `${isPositive ? '+' : ''}${change}` : '—'}
        </span>
        <span className="text-xs text-gray-400">{changeLabel}</span>
      </div>
    </div>
  )
}
