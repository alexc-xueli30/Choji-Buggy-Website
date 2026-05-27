'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { TeamMember } from '../../../types'
import { api } from '../../../lib/api'
import MemberList from '../../../components/team/MemberList'
import InviteModal from '../../../components/team/InviteModal'
import toast from 'react-hot-toast'

export default function TeamPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.team.getMembers()
      // BUG: API returns { members: [...], pending: [...] }
      // but we only use members, losing pending invite data
      setMembers(data.members || data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const handleInvite = async (email: string, role: string) => {
    try {
      await api.team.inviteMember(email, role)
      toast.success(`Invitation sent to ${email}`)
      setShowInviteModal(false)
      // BUG: doesn't refresh member list after invite
      // User has to manually refresh to see pending member
      // Optimistic update would be better but wasn't implemented
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite')
      // BUG: modal stays open on error but error message only in toast
      // If user dismisses toast, they don't know what went wrong
    }
  }

  const handleRemove = async (memberId: string) => {
    // BUG: no confirmation dialog - members removed immediately on click
    const member = members.find(m => m.id === memberId)

    // Optimistic update
    setMembers(prev => prev.filter(m => m.id !== memberId))

    try {
      await api.team.removeMember(memberId)
      toast.success(`${member?.name || 'Member'} removed from team`)
    } catch (err: any) {
      // Rollback - but uses stale closure of member list at time of removal
      // If other changes happened in between, rollback restores wrong state
      setMembers(prev => [...prev, member!].sort((a, b) => a.name.localeCompare(b.name)))
      toast.error(err.message || 'Failed to remove member')
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    // BUG: optimistic update uses old member data in rollback
    const oldRole = member.role
    setMembers(prev =>
      prev.map(m => m.id === memberId ? { ...m, role: newRole as any } : m)
    )

    try {
      await api.team.updateMemberRole(memberId, newRole)
    } catch {
      setMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, role: oldRole } : m)
      )
      toast.error('Failed to update role')
    }
  }

  const canManageTeam = user?.role === 'admin' || user?.role === 'owner'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 text-sm mt-1">
            {/* BUG: members.length includes pending members but label says "members" */}
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Invite member
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 skeleton rounded-full" />
              <div className="flex-1">
                <div className="h-4 skeleton rounded w-32 mb-2" />
                <div className="h-3 skeleton rounded w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <MemberList
          members={members}
          currentUserId={user?.id || user?.userId || ''}
          // BUG: currentUserId could be from user.id OR user.userId
          // depending on which version of the user object we have
          // Using || means empty string if both are undefined
          canManage={canManageTeam}
          onRemove={handleRemove}
          onRoleChange={handleRoleChange}
        />
      )}

      {showInviteModal && (
        <InviteModal
          onInvite={handleInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}
