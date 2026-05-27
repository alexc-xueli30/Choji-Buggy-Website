'use client'

import { useState } from 'react'
import Link from 'next/link'

type Severity = 'critical' | 'high' | 'medium' | 'low'
type Category = 'auth' | 'api' | 'state' | 'websocket' | 'ui' | 'types' | 'security' | 'performance'

interface Bug {
  id: string
  title: string
  severity: Severity
  category: Category
  files: string[]
  symptom: string
  rootCause: string
  expected: string
}

const BUGS: Bug[] = [
  // AUTH
  {
    id: 'BUG-001',
    title: 'Login always fails — API/frontend field name mismatch',
    severity: 'critical',
    category: 'auth',
    files: ['app/api/auth/login/route.ts', 'hooks/useAuth.ts', 'lib/api.ts'],
    symptom: 'Clicking "Sign in" with correct credentials shows "Invalid credentials" every time.',
    rootCause: 'The login API returns { userId, token } but the frontend destructures { user_id, access_token }. Both variables are undefined, so the token is never stored and the auth check fails.',
    expected: 'Align the API response field names with what the frontend expects (either rename the API to return access_token, or update the hook to read token and userId).',
  },
  {
    id: 'BUG-002',
    title: 'Double-submit race condition on login button',
    severity: 'high',
    category: 'auth',
    files: ['app/(auth)/login/page.tsx'],
    symptom: 'Clicking "Sign in" twice rapidly fires two simultaneous auth requests. The second may resolve first, leaving auth state in a corrupted intermediate position.',
    rootCause: 'The submit button is never disabled while isLoading is true. The disabled prop is missing from the button element.',
    expected: 'Add disabled={isLoading} to the submit button so it cannot be clicked more than once during an in-flight request.',
  },
  {
    id: 'BUG-003',
    title: 'Logout does not clear the auth cookie',
    severity: 'high',
    category: 'auth',
    files: ['lib/auth.ts'],
    symptom: 'After logout, server-side routes that read the auth cookie still treat the user as authenticated. The app redirects to /login but SSR pages briefly render as if logged in.',
    rootCause: 'clearAuthToken() removes localStorage and the refresh key but never deletes the auth_token cookie that was set during login.',
    expected: 'Add document.cookie = "auth_token=; Max-Age=0; path=/" inside clearAuthToken() to expire the cookie on logout.',
  },
  {
    id: 'BUG-004',
    title: 'JWT stored in localStorage — XSS vulnerable',
    severity: 'high',
    category: 'security',
    files: ['lib/auth.ts'],
    symptom: 'Any injected JavaScript on the page can read the auth token with localStorage.getItem("choji_auth_token") and impersonate the user.',
    rootCause: 'setAuthToken() writes the JWT to localStorage instead of an httpOnly cookie. The cookie written alongside it is also missing the Secure and HttpOnly flags.',
    expected: 'Store the token only in an httpOnly, Secure, SameSite=Strict cookie set by the server. Remove all localStorage token storage.',
  },

  // API
  {
    id: 'BUG-005',
    title: '"Mark all as read" silently deletes all notifications',
    severity: 'critical',
    category: 'api',
    files: ['app/api/notifications/route.ts', 'lib/api.ts', 'hooks/useNotifications.ts'],
    symptom: 'Clicking "Mark all as read" empties the notification list entirely instead of marking items as read.',
    rootCause: 'api.notifications.markAllRead() sends DELETE /api/notifications. The route handler sets notifications = [] instead of setting read: true on each item. The function name is misleading.',
    expected: 'Change the DELETE handler to iterate notifications and set read: true on each, OR add a dedicated PATCH /api/notifications endpoint. Rename the API method to match its actual behavior.',
  },
  {
    id: 'BUG-006',
    title: 'Dashboard fetches from wrong endpoint — always shows mock data',
    severity: 'high',
    category: 'api',
    files: ['app/(dashboard)/dashboard/page.tsx'],
    symptom: 'Dashboard stats never update. The project count, member count, and storage always show the same hardcoded numbers regardless of actual data.',
    rootCause: 'fetchStats() calls /api/user/me (a user profile endpoint) and then reads data.stats, which does not exist on that response. It silently falls back to MOCK_STATS every time.',
    expected: 'Create a /api/dashboard/stats endpoint that returns real stats, or fix the fetch call to use the correct endpoint.',
  },
  {
    id: 'BUG-007',
    title: 'Billing upgrade returns 200 before payment is processed',
    severity: 'high',
    category: 'api',
    files: ['app/api/billing/route.ts', 'hooks/useBilling.ts'],
    symptom: 'The UI shows "Upgraded to Pro!" immediately on click, before any actual payment validation. If the charge later fails, the UI never reflects that.',
    rootCause: 'The POST /api/billing upgrade handler updates the in-memory subscription state and returns 200 synchronously. The optimistic update in useBilling.ts also fires before the response, and the result from the API is never read to confirm.',
    expected: 'The API should validate payment before returning 200. The frontend should wait for the API response before updating UI, not apply an optimistic update for a billing action.',
  },
  {
    id: 'BUG-008',
    title: 'Team invite allows duplicate invitations',
    severity: 'medium',
    category: 'api',
    files: ['app/api/team/route.ts'],
    symptom: 'Inviting the same email address twice sends two invite emails and creates two pending member records.',
    rootCause: 'The POST handler checks teamMembers for duplicates but does not check pendingInvites. Additionally, two rapid simultaneous POST requests can both pass the duplicate check before either writes its result.',
    expected: 'Check both teamMembers and pendingInvites arrays for the email before creating a new invite. Use an atomic operation or lock to prevent the race condition.',
  },
  {
    id: 'BUG-009',
    title: 'API endpoints lack authentication checks',
    severity: 'high',
    category: 'security',
    files: ['app/api/notifications/route.ts', 'app/api/team/route.ts', 'app/api/billing/route.ts'],
    symptom: 'Any unauthenticated request to /api/notifications, /api/team, or /api/billing returns real data. The token in the Authorization header is never verified.',
    rootCause: 'Route handlers read the Authorization header in comments/TODOs but never actually validate the JWT. The /api/user/me handler just checks the header exists, not that it is valid.',
    expected: 'Add a shared auth middleware that verifies the JWT on every protected route and returns 401 if the token is missing or invalid.',
  },

  // STATE
  {
    id: 'BUG-010',
    title: 'Notification unread count desynchronises from the list',
    severity: 'high',
    category: 'state',
    files: ['hooks/useNotifications.ts', 'components/notifications/NotificationBell.tsx'],
    symptom: 'The notification bell shows 3 unread but the notifications page shows 1. After marking one as read, the counter can go negative.',
    rootCause: 'unreadCount is stored as separate state and updated independently by markAsRead (decrements by 1) and fetchNotifications (recalculates from full list). They diverge when the fetch races with a mark-read action. NotificationBell also keeps a local copy that lags one render.',
    expected: 'Derive unreadCount directly from the notifications array (notifications.filter(n => !n.read).length) instead of maintaining it as separate state.',
  },
  {
    id: 'BUG-011',
    title: 'Stale closure in markAllAsRead loses new notifications',
    severity: 'medium',
    category: 'state',
    files: ['hooks/useNotifications.ts'],
    symptom: 'If a new notification arrives via WebSocket between renders then the user clicks "Mark all as read", the new notification is not included in the rollback snapshot and may reappear as unread after a failure.',
    rootCause: 'markAllAsRead captures notifications in a closure at creation time. Because [notifications] is in its dependency array, a new function is created on every notification update — but the captured value inside the try block is still the pre-WebSocket snapshot.',
    expected: 'Use a functional update (setNotifications(prev => prev.map(...))) inside markAllAsRead so it always operates on the latest state, not a captured snapshot.',
  },
  {
    id: 'BUG-012',
    title: 'Search shows stale results during a new query',
    severity: 'medium',
    category: 'state',
    files: ['hooks/useSearch.ts', 'components/search/SearchResults.tsx'],
    symptom: 'When typing a new search term, the previous results remain visible until the new results arrive, causing a flash of wrong content.',
    rootCause: 'updateQuery() does not clear the results array. The broken debounce also means multiple requests are in-flight simultaneously; whichever finishes last wins regardless of whether it matches the current query.',
    expected: 'Clear results in updateQuery() when the query changes. Fix the debounce by storing the timer in a ref and clearing it before setting a new one.',
  },
  {
    id: 'BUG-013',
    title: 'Settings changes revert on page reload',
    severity: 'medium',
    category: 'state',
    files: ['app/(dashboard)/settings/page.tsx', 'app/api/user/route.ts'],
    symptom: 'Clicking "Save changes" shows a success toast, but refreshing the page resets all fields to their previous values.',
    rootCause: 'The PUT /api/user/me handler mutates an in-memory JavaScript object that resets on every serverless cold start. Additionally, if both updateProfile and updateSettings are called in sequence, the second call overwrites fields from the first because they hit the same endpoint with partial payloads.',
    expected: 'Use a real persistent store (database). Merge patch updates server-side so sequential calls do not overwrite each other.',
  },
  {
    id: 'BUG-014',
    title: 'Dashboard double-fetches on every render cycle',
    severity: 'medium',
    category: 'state',
    files: ['app/(dashboard)/dashboard/page.tsx'],
    symptom: 'Network tab shows two identical requests to /api/user/me on every page load and the stats briefly flicker.',
    rootCause: 'Two useEffect hooks both call fetchStats. The second fires whenever the user object reference changes — which happens on every auth re-validation cycle, since useAuth recreates the user object each time.',
    expected: 'Consolidate into a single useEffect. Stabilise the user reference in useAuth with useMemo or compare by user.id rather than by object reference.',
  },

  // WEBSOCKET
  {
    id: 'BUG-015',
    title: 'Two WebSocket connections open simultaneously',
    severity: 'high',
    category: 'websocket',
    files: ['hooks/useWebSocket.ts', 'hooks/useNotifications.ts'],
    symptom: 'Every notification arrives twice. Browser DevTools > Network > WS shows two open connections to ws://localhost:3001.',
    rootCause: 'useNotifications calls both useSimpleWebSocket and the polling mechanism. useSimpleWebSocket creates its own WebSocket instance independent of the globalSocket used by useWebSocket. Both receive the same server events.',
    expected: 'Remove useSimpleWebSocket from useNotifications. Use a single shared connection from useWebSocket, or implement a proper pub/sub abstraction so all consumers share one socket.',
  },
  {
    id: 'BUG-016',
    title: 'WebSocket reconnect creates zombie connections',
    severity: 'high',
    category: 'websocket',
    files: ['hooks/useWebSocket.ts'],
    symptom: 'After a network blip, the console shows multiple "connected" messages and events fire multiple times. Memory usage grows over time.',
    rootCause: 'The onclose handler schedules a reconnect via setTimeout, but the timeout reference is never stored so it cannot be cancelled. When the component unmounts, the cleanup returns without closing the socket, so the onclose fires, schedules another reconnect, and the cycle repeats with orphaned connections.',
    expected: 'Store the reconnect timeout in a ref and clear it in the cleanup function. Close the socket in cleanup. Use a flag (e.g. intentionallyClosed) to suppress reconnect on deliberate unmount.',
  },
  {
    id: 'BUG-017',
    title: 'WebSocket message handler is a stale closure',
    severity: 'medium',
    category: 'websocket',
    files: ['hooks/useWebSocket.ts'],
    symptom: 'If the parent component passes a new onMessage callback (e.g. after state updates), the socket continues calling the original function from the first render.',
    rootCause: 'messageHandlerRef is set once to the initial onMessage value and never updated. The comment in the code notes this but the fix was never applied.',
    expected: 'Add a useEffect that updates messageHandlerRef.current = onMessage whenever onMessage changes, so the socket always calls the latest handler.',
  },

  // TYPES
  {
    id: 'BUG-018',
    title: 'Billing subscription renewal date shows "Jan 1, 1970"',
    severity: 'medium',
    category: 'types',
    files: ['app/api/billing/route.ts', 'app/(dashboard)/billing/page.tsx', 'lib/utils.ts'],
    symptom: 'The "Renews on" date on the billing page displays as "Jan 1, 1970" or a similarly wrong date.',
    rootCause: 'The API returns currentPeriodEnd as a Unix timestamp (number: 1735689600). The Subscription type declares it as string. formatDate receives the number, its typeof check routes it through fromUnixTime correctly — but the billing page casts it as any before passing, bypassing the check.',
    expected: 'Fix the Subscription type to accept number | string. Ensure formatDate\'s Unix path is used consistently, or normalise all dates to ISO strings at the API boundary.',
  },
  {
    id: 'BUG-019',
    title: 'Plan card shows "undefined users max" for all plans',
    severity: 'low',
    category: 'types',
    files: ['app/api/billing/route.ts', 'components/billing/PlanCard.tsx', 'types/index.ts'],
    symptom: 'Every plan card displays "Up to undefined users" instead of the real limit.',
    rootCause: 'The API returns max_users (snake_case) but the BillingPlan TypeScript type defines maxUsers (camelCase). plan.maxUsers is always undefined. The PlanCard has a fallback to (plan as any).max_users but it was added after the fact and inconsistently applied.',
    expected: 'Standardise on one convention. Either transform the API response to camelCase before storing in state, or update the type to use snake_case to match the API.',
  },
  {
    id: 'BUG-020',
    title: 'Notification type "alert" causes silent rendering failures',
    severity: 'medium',
    category: 'types',
    files: ['app/api/notifications/route.ts', 'types/index.ts', 'components/notifications/NotificationList.tsx'],
    symptom: 'Some notifications from the API render without a colour indicator. The storage warning notification specifically has no visual type styling.',
    rootCause: 'The API sends type: "alert" for warning-level notifications. The Notification type only allows "info" | "warning" | "error" | "success". The TYPE_COLORS lookup in NotificationList has no entry for "alert", so the indicator is unstyled.',
    expected: 'Add "alert" to the Notification type union and to the TYPE_COLORS map, or normalise the API to return "warning" instead of "alert".',
  },
  {
    id: 'BUG-021',
    title: 'User has duplicate identity fields — components use wrong one',
    severity: 'medium',
    category: 'types',
    files: ['types/index.ts', 'app/(dashboard)/team/page.tsx', 'components/team/MemberList.tsx'],
    symptom: '"You" badge never appears next to your own name on the Team page. Self-removal protection does not trigger.',
    rootCause: 'The User type has both id and userId (same value, different names). The team page passes user?.id || user?.userId as currentUserId. MemberList compares that against member.user_id (snake_case from the API). The three different field name conventions never match.',
    expected: 'Pick one canonical identity field across User, TeamMember, and all comparisons. Normalise the API to return a consistent field name.',
  },

  // PERFORMANCE
  {
    id: 'BUG-022',
    title: 'Polling and WebSocket run simultaneously — duplicate network load',
    severity: 'medium',
    category: 'performance',
    files: ['hooks/useNotifications.ts'],
    symptom: 'A new notification triggers a WebSocket push AND a polling request within milliseconds of each other, doubling the network requests and causing flicker.',
    rootCause: 'useNotifications sets up a 30-second polling interval via setInterval AND subscribes to WebSocket events. Both are active at the same time with no coordination between them.',
    expected: 'Choose one real-time strategy. If WebSocket is available, disable polling. Fall back to polling only when the WebSocket is disconnected.',
  },
  {
    id: 'BUG-023',
    title: 'File uploader does not cancel in-flight requests on unmount',
    severity: 'medium',
    category: 'performance',
    files: ['components/upload/FileUploader.tsx', 'lib/api.ts'],
    symptom: 'Navigating away from the Files page mid-upload causes a "Can\'t perform a React state update on an unmounted component" warning. The upload continues consuming bandwidth in the background.',
    rootCause: 'api.files.upload() uses axios with no AbortController or CancelToken. The FileUploader component has no cleanup to cancel the request when it unmounts.',
    expected: 'Create an AbortController in the upload handler. Pass signal to the request. In the component\'s cleanup (useEffect return), call abort() on any active upload.',
  },
  {
    id: 'BUG-024',
    title: 'Broken debounce fires multiple search requests per keystroke',
    severity: 'medium',
    category: 'performance',
    files: ['hooks/useSearch.ts'],
    symptom: 'Typing "hello" fires 5 API requests instead of 1. The final results shown may belong to an earlier query if a slow request resolves last.',
    rootCause: 'The useEffect debounce stores the timer in a local variable inside the effect, which is re-created every render. React\'s cleanup only cancels the immediately previous timer. For rapid typing, several timers accumulate and fire. The requestId race-condition guard also has a flaw — isLoading is set to false for stale responses.',
    expected: 'Store the debounce timer in a useRef so it persists across renders and the latest effect cleanup always cancels it. Set isLoading to false only when the response matches the current requestId.',
  },

  // UI
  {
    id: 'BUG-025',
    title: 'Password change form has no submit handler',
    severity: 'high',
    category: 'ui',
    files: ['app/(dashboard)/settings/page.tsx'],
    symptom: 'Filling in the password change form on the Settings > Security tab and clicking "Update password" does nothing.',
    rootCause: 'The password form fields are uncontrolled (no value/onChange). The "Update password" button has no onClick and the form has no onSubmit. The entire section is inert HTML.',
    expected: 'Add controlled state for currentPassword, newPassword, confirmPassword. Add form validation. Wire up a handler that calls a PUT /api/auth/password endpoint.',
  },
  {
    id: 'BUG-026',
    title: 'Dark mode toggle does nothing',
    severity: 'low',
    category: 'ui',
    files: ['app/(dashboard)/settings/page.tsx', 'tailwind.config.js', 'app/globals.css'],
    symptom: 'Selecting "Dark" or "System default" in Settings > Profile shows a "coming soon" message. The app never changes appearance.',
    rootCause: 'Tailwind dark mode is configured with strategy: "class", meaning a dark class must be added to <html>. No code ever does this. The CSS variables for dark mode are defined in globals.css but the JavaScript to apply the class is missing entirely.',
    expected: 'On theme change, add or remove the dark class from document.documentElement. Persist the preference to localStorage and apply it on app init in layout.tsx.',
  },
  {
    id: 'BUG-027',
    title: '"Change photo" and "Sign out all sessions" buttons do nothing',
    severity: 'low',
    category: 'ui',
    files: ['app/(dashboard)/settings/page.tsx'],
    symptom: 'Clicking "Change photo" on the Settings page has no effect. Clicking "Sign out all other sessions" has no effect.',
    rootCause: 'Both buttons have no onClick handler. They are purely decorative. No file input is wired to the avatar button, and no API endpoint exists for session revocation.',
    expected: 'Wire "Change photo" to a hidden file input that triggers an upload. Create a DELETE /api/auth/sessions endpoint and call it from the "Sign out all sessions" button.',
  },
  {
    id: 'BUG-028',
    title: 'Sidebar active state incorrectly highlights wrong nav items',
    severity: 'low',
    category: 'ui',
    files: ['components/layout/Sidebar.tsx'],
    symptom: 'On the Settings page, both "Settings" and "Search" may appear highlighted. The active highlight can match the wrong item depending on the current path.',
    rootCause: 'The isActive check uses pathname.startsWith(item.href). Since /settings starts with /s and /search also starts with /s, the logic can match incorrectly. The condition excludes /dashboard from the startsWith check but not in a way that handles sub-paths cleanly.',
    expected: 'Use exact pathname === item.href for all top-level routes, or use Next.js useSelectedLayoutSegment() which is designed for this purpose.',
  },
]

const CATEGORY_LABELS: Record<Category, string> = {
  auth:        'Authentication',
  api:         'API / Data',
  state:       'State Management',
  websocket:   'WebSocket',
  types:       'TypeScript / Types',
  security:    'Security',
  performance: 'Performance',
  ui:          'UI / UX',
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: 'bg-red-50 text-red-700 border-red-200',      dot: 'bg-red-500' },
  high:     { label: 'High',     color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  medium:   { label: 'Medium',   color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  low:      { label: 'Low',      color: 'bg-gray-50 text-gray-600 border-gray-200',   dot: 'bg-gray-400' },
}

const CATEGORY_COLORS: Record<Category, string> = {
  auth:        'bg-purple-50 text-purple-700',
  api:         'bg-blue-50 text-blue-700',
  state:       'bg-cyan-50 text-cyan-700',
  websocket:   'bg-indigo-50 text-indigo-700',
  types:       'bg-pink-50 text-pink-700',
  security:    'bg-red-50 text-red-700',
  performance: 'bg-amber-50 text-amber-700',
  ui:          'bg-green-50 text-green-700',
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const ALL_SEVERITIES = ['critical', 'high', 'medium', 'low'] as Severity[]

export default function BugsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = BUGS.filter(bug => {
    if (selectedCategory !== 'all' && bug.category !== selectedCategory) return false
    if (selectedSeverity !== 'all' && bug.severity !== selectedSeverity) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        bug.title.toLowerCase().includes(q) ||
        bug.symptom.toLowerCase().includes(q) ||
        bug.files.some(f => f.toLowerCase().includes(q))
      )
    }
    return true
  })

  const counts: Record<Severity, number> = {
    critical: BUGS.filter(b => b.severity === 'critical').length,
    high:     BUGS.filter(b => b.severity === 'high').length,
    medium:   BUGS.filter(b => b.severity === 'medium').length,
    low:      BUGS.filter(b => b.severity === 'low').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-gray-900">Choji</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Bug Challenge Board</span>
          </div>
          <Link
            href="/login"
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            Sign in to app
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Bug Challenge Board</h1>
            <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
              {BUGS.length} bugs
            </span>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            Every bug on this board is intentionally planted in the Choji codebase. An AI agent
            should be able to identify each one, trace its root cause across files, and produce a
            correct fix. Start with <strong>BUG-001</strong> — it blocks login entirely.
          </p>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-3">
          {ALL_SEVERITIES.map(sev => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(selectedSeverity === sev ? 'all' : sev)}
              className={`rounded-xl border p-3 text-left transition-all ${
                selectedSeverity === sev
                  ? SEVERITY_CONFIG[sev].color + ' border-current'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${SEVERITY_CONFIG[sev].dot}`} />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {SEVERITY_CONFIG[sev].label}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{counts[sev]}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search bugs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white shadow-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-400">
          Showing {filtered.length} of {BUGS.length} bugs
          {(selectedCategory !== 'all' || selectedSeverity !== 'all' || search) && (
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedSeverity('all'); setSearch('') }}
              className="ml-2 text-blue-500 hover:text-blue-600 underline"
            >
              clear filters
            </button>
          )}
        </p>

        {/* Bug list */}
        <div className="space-y-2 pb-12">
          {filtered.map(bug => {
            const sev = SEVERITY_CONFIG[bug.severity]
            const isOpen = expandedId === bug.id

            return (
              <div
                key={bug.id}
                className={`bg-white rounded-xl border transition-all ${
                  isOpen ? 'border-blue-200 shadow-sm' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Row header */}
                <button
                  className="w-full text-left p-4 flex items-start gap-3"
                  onClick={() => setExpandedId(isOpen ? null : bug.id)}
                >
                  <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sev.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{bug.id}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sev.color}`}>
                        {sev.label}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[bug.category]}`}>
                        {CATEGORY_LABELS[bug.category]}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{bug.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{bug.symptom}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-5 border-t border-gray-50 pt-4 space-y-4">

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Affected files</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bug.files.map(f => (
                          <span key={f} className="text-xs font-mono bg-gray-50 border border-gray-200 text-gray-700 px-2 py-1 rounded-md">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">What the user sees</p>
                      <p className="text-sm text-gray-700 leading-relaxed bg-orange-50 border border-orange-100 rounded-lg px-3 py-2.5">
                        {bug.symptom}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Root cause</p>
                      <p className="text-sm text-gray-700 leading-relaxed bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                        {bug.rootCause}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">What Choji should do</p>
                      <p className="text-sm text-gray-700 leading-relaxed bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                        {bug.expected}
                      </p>
                    </div>

                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
              <p className="text-sm">No bugs match the current filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
