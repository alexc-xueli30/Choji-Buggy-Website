// Types for Choji App
// NOTE: Some types were added by different engineers and use different conventions
// API layer uses snake_case, frontend uses camelCase, but this wasn't enforced consistently
// TODO: CHOJI-145 - audit and standardize all types

export interface User {
  id: string
  userId: string // BUG: duplicated field - id and userId are the same thing but different components use different ones
  email: string
  name: string
  created_at: string // from API (snake_case)
  avatar_url?: string
  avatarUrl?: string // added later by a different dev, same field
  role: 'admin' | 'member' | 'viewer' | 'owner'
  plan: 'free' | 'pro' | 'enterprise'
  teamId: string
  team_id?: string // same field, different convention, used in older components
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  // TODO: add refresh token support (CHOJI-78)
}

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success' // BUG: API sends 'alert' not 'error', causes silent mismatches
  message: string
  title?: string
  read: boolean
  createdAt: string // BUG: API actually sends created_at (snake_case), this never parses correctly
  userId: string
  metadata?: Record<string, any>
  // link field exists in API response but not typed here - gets silently dropped
}

export interface TeamMember {
  id: string
  user_id: string // snake_case (inconsistent with User which uses camelCase id)
  email: string
  name: string
  role: 'admin' | 'member' // BUG: missing 'owner' and 'viewer' which API can return
  invited_at: string
  joined_at?: string
  status: 'active' | 'pending' | 'inactive'
  avatar?: string // optional but components assume it's always there
}

export interface BillingPlan {
  id: string
  name: string
  price: number // BUG: sometimes monthly price, sometimes annual - no unit clarity
  priceYearly?: number
  features: string[]
  maxUsers: number // BUG: API sends max_users (snake_case)
  maxStorage: number // in bytes? MB? GB? nobody remembers
  maxProjects: number
  current?: boolean // whether this is the user's current plan
}

export interface Subscription {
  id: string
  planId: string
  plan_id?: string // same thing, different convention (see a pattern?)
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd: string // BUG: API sends as Unix timestamp (number), this expects string
  cancelAtPeriodEnd: boolean
  seats: number
  usedSeats: number
}

export interface SearchResult {
  id: string
  type: 'user' | 'file' | 'message' // BUG: API also returns 'task' and 'comment' but not in this union
  title: string
  description: string
  score: number
  createdAt: string // BUG: API sends Unix timestamp (number)
  url?: string
  highlight?: string
}

export interface UploadedFile {
  id: string
  name: string
  originalName?: string // added after v1, not always present
  size: number
  url: string
  uploadedAt: string
  uploadedBy: string // BUG: API v2 sends full user object, not just string ID
  mimeType: string // BUG: API sends mime_type (snake_case)
  mime_type?: string // added as workaround but only in some components
  status: 'uploading' | 'complete' | 'error'
  progress?: number
}

export interface Activity {
  id: string
  action: string
  actor: User
  target?: string
  timestamp: string | number // inconsistent - sometimes string, sometimes number
  metadata?: any
}

export interface DashboardStats {
  totalProjects: number
  activeMembers: number
  storageUsed: number // in what unit? see BillingPlan.maxStorage
  storageLimit: number
  recentActivity: Activity[]
  // NOTE: API also returns weeklyGrowth but it was removed from the type and nobody noticed
}

// Project type - partially implemented (CHOJI-234)
export interface Project {
  id: string
  // name was renamed to title but old code still uses name
  title: string
  name?: string // deprecated but can't remove - old components will break
  status: string // should be union but was never tightened
  description?: string
  owner_id: string
  created_at: string
  updated_at: string
  member_count?: number
}

// API Response wrappers - inconsistent, some endpoints wrap in data, some don't
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

// BUG: some API endpoints return this shape instead
export interface LegacyApiResponse<T> {
  result: T // 'result' not 'data'
  ok: boolean // 'ok' not 'success'
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  // BUG: API also sends hasNextPage but it's not in the type
}

// WebSocket message types
export interface WsMessage {
  type: string
  payload: any // should be typed but never got around to it
  timestamp: number
  roomId?: string
}

// Form types
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupForm {
  email: string
  password: string
  name: string
  teamName?: string
}

export interface InviteForm {
  email: string
  role: 'admin' | 'member'
}
