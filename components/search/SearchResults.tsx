'use client'

import { SearchResult } from '../../types'
import { formatDate } from '../../lib/utils'

interface Props {
  results: SearchResult[]
  isLoading: boolean
  query: string
}

const TYPE_ICON: Record<string, string> = {
  user: '👤',
  file: '📄',
  message: '💬',
  task: '✓',
  comment: '💬',
}

export default function SearchResults({ results, isLoading, query }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 flex gap-3">
            <div className="w-8 h-8 skeleton rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-1/2" />
              <div className="h-3 skeleton rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!results.length) {
    return null // parent handles empty state messaging
  }

  return (
    <div className="space-y-2">
      {results.map(result => (
        <div
          key={result.id}
          className="bg-white border border-gray-100 rounded-xl p-4 flex gap-3 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all"
          onClick={() => {
            // BUG: result.url exists in mock data but not in SearchResult type
            // so this cast is needed, but navigation silently fails if url is undefined
            const url = (result as any).url
            if (url) window.location.href = url
            // BUG: uses window.location instead of router.push - full page reload
          }}
        >
          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-sm flex-shrink-0 border border-gray-100">
            {/* BUG: 'task' and 'comment' types exist in API data but not in SearchResult type
                so TYPE_ICON lookup works via the Record but TS would flag result.type as invalid */}
            {TYPE_ICON[result.type] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{result.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{result.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400 capitalize">{result.type}</span>
              <span className="text-gray-200">•</span>
              {/* BUG: result.createdAt is a number (Unix timestamp from API) but
                  formatDate with typeof check handles numbers - however it uses fromUnixTime
                  which expects seconds, but API mock returns milliseconds-style timestamps */}
              <span className="text-xs text-gray-400">{formatDate(result.createdAt as any)}</span>
            </div>
          </div>
          {result.score && (
            <div className="text-xs text-gray-300 self-start mt-1">
              {Math.round(result.score * 100)}%
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
