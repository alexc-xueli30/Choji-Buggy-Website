'use client'

import { TeamMember } from '../../types'
import { formatDate } from '../../lib/utils'

interface Props {
  members: TeamMember[]
  currentUserId: string
  canManage: boolean
  onRemove: (id: string) => void
  onRoleChange: (id: string, role: string) => void
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
  owner: 'Owner',
  // BUG: 'viewer' and 'owner' are in API responses but not in TeamMember type
}

export default function MemberList({ members, currentUserId, canManage, onRemove, onRoleChange }: Props) {
  if (!members.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-8 text-center text-gray-400 text-sm">
        No team members yet
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
      {members.map(member => {
        // BUG: member.user_id (snake_case) vs currentUserId which uses user.id or user.userId
        // This comparison may never be true, so "You" badge and self-removal prevention never trigger
        const isSelf = member.user_id === currentUserId || member.id === currentUserId

        return (
          <div key={member.id} className="flex items-center gap-3 p-4">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ background: '#4f6ef7' }}
            >
              {/* BUG: member.avatar is null (from API) - this falls through to initial correctly
                  but member.name[0] crashes if name is empty string */}
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                member.name[0]?.toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                {isSelf && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">You</span>
                )}
                {member.status === 'pending' && (
                  <span className="text-xs bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-200">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{member.email}</p>
            </div>

            {/* Role selector */}
            {canManage && !isSelf ? (
              <select
                value={member.role}
                onChange={(e) => onRoleChange(member.id, e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:border-blue-300"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                {/* BUG: 'owner' not an option here but API can return it */}
              </select>
            ) : (
              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                {ROLE_LABELS[member.role] || member.role}
              </span>
            )}

            {/* Remove button */}
            {canManage && !isSelf && (
              <button
                onClick={() => onRemove(member.id)}
                className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                title="Remove member"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
