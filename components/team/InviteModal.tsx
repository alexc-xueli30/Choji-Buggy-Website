'use client'

// BUG: modal has no protection against double-submit
// User can click "Send invite" multiple times before API responds
// Each click fires a separate API request → duplicate invites sent

import { useState } from 'react'

interface Props {
  onInvite: (email: string, role: string) => Promise<void>
  onClose: () => void
}

export default function InviteModal({ onInvite, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    // BUG: no email format validation here
    // lib/utils.ts has isValidEmail() but it's not called

    setIsLoading(true)
    // BUG: button disabled state is set AFTER this point but the button
    // is not actually disabled until the next render - rapid clicks can submit twice
    try {
      await onInvite(email.trim(), role)
      // parent handles toast and modal close
    } catch (err: any) {
      setError(err.message || 'Failed to send invite')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">Invite team member</h2>
          <p className="text-sm text-gray-500 mt-1">They'll receive an email invitation to join your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="colleague@company.com"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="form-input"
            >
              <option value="admin">Admin — full access</option>
              <option value="member">Member — can view and edit</option>
              <option value="viewer">Viewer — read only</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {/* BUG: disabled={isLoading} is set but React batches state updates
                so there's a brief window where isLoading is still false on rerender
                during the async gap between click and setIsLoading(true) */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
