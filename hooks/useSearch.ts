'use client'

// Search hook - handles search with debouncing and filters
// BUG: debounce implementation doesn't clear old timers properly
// See CHOJI-178: "search results show wrong data sometimes"

import { useState, useEffect, useCallback, useRef } from 'react'
import { SearchResult } from '../types'
import { api } from '../lib/api'

interface SearchFilters {
  type?: string
  dateFrom?: string
  dateTo?: string
  teamId?: string
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [totalResults, setTotalResults] = useState(0)

  // Ref to track in-flight request for "cancellation" (doesn't actually cancel)
  const requestIdRef = useRef(0)
  // BUG: this is used to ignore stale responses but the approach is flawed
  // requestIdRef.current is incremented but the async function captures the old value
  // If two requests fire, both can update state - whichever finishes last wins

  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    if (!searchQuery.trim()) {
      setResults([])
      setTotalResults(0)
      return
    }

    const currentRequestId = ++requestIdRef.current

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.search.query(searchQuery, searchFilters)

      // BUG: race condition check - but requestIdRef.current could have changed
      // by the time we're here if another search fired while awaiting
      if (currentRequestId !== requestIdRef.current) {
        // stale response, ignore it
        return
      }

      // BUG: API returns { results: [...], total: N } but sometimes returns just an array
      // No consistent handling
      if (Array.isArray(data)) {
        setResults(data)
        setTotalResults(data.length)
      } else {
        setResults(data.results || data.items || [])
        setTotalResults(data.total || data.count || 0)
      }
    } catch (err: any) {
      if (currentRequestId === requestIdRef.current) {
        setError(err.message || 'Search failed')
        setResults([])
      }
    } finally {
      // BUG: isLoading set to false even for stale requests that were ignored
      // This can cause premature loading spinner removal
      setIsLoading(false)
    }
  }, [])

  // BUG: custom debounce that doesn't work correctly
  // Each call to useEffect creates a new setTimeout WITHOUT clearing the previous one
  // This is because `query` and `filters` are in the dependency array
  // but the timeout cleanup only runs when the effect reruns, AFTER the timeout may have fired
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true) // BUG: sets loading before debounce resolves - spinner appears immediately

    // BUG: this timeout is "the debounce" but it doesn't cancel properly
    // If user types 10 characters rapidly, 10 timeouts are created
    // They all fire 300ms after the LAST keystroke that created them
    // Actually, the cleanup does run... but only for the previous effect invocation
    // So the last-but-one timeout gets cancelled, but all earlier ones run
    const timer = setTimeout(() => {
      performSearch(query, filters)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, filters, performSearch])

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery)
    // BUG: results not cleared here - old results visible while new search runs
    // This causes flash of old content
  }, [])

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    // BUG: doesn't reset pagination when filters change
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setFilters({})
    setTotalResults(0)
    // BUG: doesn't cancel pending search request - stale results can appear after clear
  }, [])

  return {
    query,
    results,
    isLoading,
    error,
    filters,
    totalResults,
    setQuery: updateQuery,
    updateFilters,
    clearSearch,
    // BUG: search function exposed directly - callers can bypass debounce
    search: performSearch,
  }
}
