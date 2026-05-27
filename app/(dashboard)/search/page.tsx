'use client'

import { useEffect } from 'react'
import { useSearch } from '../../../hooks/useSearch'
import SearchBar from '../../../components/search/SearchBar'
import SearchResults from '../../../components/search/SearchResults'

export default function SearchPage() {
  const {
    query,
    results,
    isLoading,
    error,
    filters,
    totalResults,
    setQuery,
    updateFilters,
    clearSearch,
  } = useSearch()

  // BUG: URL sync not implemented - refreshing page loses search state
  // Also, deep-linking to /search?q=foo doesn't populate the search field
  useEffect(() => {
    // TODO: CHOJI-178 - sync query with URL params
    // const params = new URLSearchParams(window.location.search)
    // const q = params.get('q')
    // if (q) setQuery(q)
  }, [])

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-sm text-gray-500 mt-1">Find anything across your workspace</p>
      </div>

      <SearchBar
        value={query}
        onChange={setQuery}
        onClear={clearSearch}
        isLoading={isLoading}
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'user', 'file', 'message'] as const).map(type => (
          <button
            key={type}
            onClick={() => updateFilters({ type: type === 'all' ? undefined : type })}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              (filters.type === type) || (type === 'all' && !filters.type)
                ? 'bg-primary-500 text-white border-primary-500'
                : 'border-gray-200 text-gray-600 hover:border-primary-300'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Results area */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          Search failed: {error}
        </div>
      )}

      {query && (
        <div>
          {!isLoading && (
            <p className="text-sm text-gray-500 mb-3">
              {/* BUG: shows "0 results" briefly before results arrive due to stale isLoading state */}
              {totalResults > 0 ? `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"` : `No results for "${query}"`}
            </p>
          )}

          <SearchResults
            results={results}
            isLoading={isLoading}
            query={query}
          />
        </div>
      )}

      {!query && (
        <div className="py-12 text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">Start typing to search your workspace</p>
        </div>
      )}
    </div>
  )
}
