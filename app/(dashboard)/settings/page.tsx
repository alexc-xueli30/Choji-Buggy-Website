'use client'

// Settings page - manages user profile and preferences
// BUG: save doesn't actually persist - reloading page resets everything
// The PUT /api/user/me endpoint updates in-memory state only

import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

interface SettingsForm {
  name: string
  email: string
  timezone: string
  emailNotifications: boolean
  slackNotifications: boolean
  theme: 'light' | 'dark' | 'system'
  // BUG: 'system' option in UI but theme switching logic only handles 'light' and 'dark'
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState<SettingsForm>({
    name: '',
    email: '',
    timezone: 'America/Los_Angeles',
    emailNotifications: true,
    slackNotifications: false,
    theme: 'light',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile')

  // BUG: form populated from user state on mount
  // but user object might not have all settings fields
  // e.g. user.settings doesn't exist in User type (CHOJI-145)
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        timezone: (user as any).settings?.timezone || 'America/Los_Angeles',
        emailNotifications: (user as any).settings?.emailNotifications ?? true,
        slackNotifications: (user as any).settings?.slackNotifications ?? false,
        theme: (user as any).settings?.theme || 'light',
      })
    }
  }, [user]) // BUG: re-runs when user reference changes, resetting unsaved form changes

  const handleChange = (field: keyof SettingsForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value

    setForm(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // BUG: sends entire form as profile update
      // But /api/user/me PUT merges profile AND settings in same call
      // If you update name then update theme, second call overwrites name
      await api.user.updateProfile({
        name: form.name,
        email: form.email,
      })

      // BUG: settings updated in separate call - but if this fails,
      // profile was already saved and we show success toast
      // No transaction - partial save possible
      await api.user.updateSettings({
        timezone: form.timezone,
        emailNotifications: form.emailNotifications,
        slackNotifications: form.slackNotifications,
        theme: form.theme,
      })

      // BUG: updateUser only updates local state, not API
      // But we just called the API above... so local state may be out of sync
      // if the API returned updated data (it does) but we don't use it
      updateUser({ name: form.name, email: form.email })

      setHasChanges(false)
      toast.success('Settings saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['profile', 'notifications', 'security'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ background: '#4f6ef7' }}
            >
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                Change photo
              </button>
              {/* BUG: no file upload handler - button does nothing */}
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG up to 2MB</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              className="form-input"
            />
            {/* BUG: changing email doesn't trigger verification email */}
            <p className="text-xs text-gray-400 mt-1">Changing your email requires verification</p>
            {/* ^ the text says verification is required but it doesn't happen */}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
            <select value={form.timezone} onChange={handleChange('timezone')} className="form-input">
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="Europe/London">GMT</option>
              <option value="Europe/Paris">Central European Time (CET)</option>
              <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Theme</label>
            <select value={form.theme} onChange={handleChange('theme')} className="form-input">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System default</option>
            </select>
            {/* BUG: theme selection does nothing - dark mode not implemented */}
            {form.theme !== 'light' && (
              <p className="text-xs text-amber-500 mt-1">
                Dark mode is coming soon! (it says this for dark AND system)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-medium text-gray-900">Email Notifications</h2>

          {[
            { key: 'emailNotifications', label: 'Email notifications', desc: 'Receive updates via email' },
            { key: 'slackNotifications', label: 'Slack notifications', desc: 'Send notifications to Slack' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form[item.key as keyof SettingsForm] as boolean}
                  onChange={handleChange(item.key as keyof SettingsForm)}
                />
                <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="font-medium text-gray-900 mb-4">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
                <input type="password" className="form-input" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                <input type="password" className="form-input" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                <input type="password" className="form-input" placeholder="••••••••" />
              </div>
              <button className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800">
                Update password
              </button>
              {/* BUG: password change form has no state or submit handler - completely non-functional */}
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="font-medium text-gray-900 mb-2">Active Sessions</h2>
            <p className="text-xs text-gray-400 mb-3">Manage where you're logged in</p>
            <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
              Current session: Chrome on macOS
              {/* BUG: hardcoded, not dynamic */}
            </div>
            <button className="mt-3 text-sm text-red-500 hover:text-red-600">
              Sign out all other sessions
            </button>
            {/* BUG: no handler on this button */}
          </div>
        </div>
      )}

      {/* Save button */}
      {hasChanges && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-primary-100 shadow-sm p-4">
          <p className="text-sm text-gray-600">You have unsaved changes</p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // BUG: discard resets to user state but user state might be stale
                if (user) {
                  setForm({
                    name: user.name || '',
                    email: user.email || '',
                    timezone: (user as any).settings?.timezone || 'America/Los_Angeles',
                    emailNotifications: (user as any).settings?.emailNotifications ?? true,
                    slackNotifications: (user as any).settings?.slackNotifications ?? false,
                    theme: (user as any).settings?.theme || 'light',
                  })
                }
                setHasChanges(false)
              }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="text-sm bg-primary-500 text-white px-4 py-1.5 rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
