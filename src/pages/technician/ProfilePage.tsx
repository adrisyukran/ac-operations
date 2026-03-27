import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Technician } from '../../lib/supabase'

export default function ProfilePage() {
  const { user } = useAuth()
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editPhone, setEditPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // Fetch technician profile data
  useEffect(() => {
    fetchTechnicianProfile()
  }, [user])

  const fetchTechnicianProfile = async () => {
    if (!user?.technician_id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', user.technician_id)
        .single()

      if (error) throw error
      setTechnician(data)
      setEditPhone(data.phone || '')
    } catch (error) {
      console.error('Error fetching technician profile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Validate phone number format
  const validatePhone = (phone: string): boolean => {
    // Basic Malaysian phone format validation
    // Accept formats: +60123456789, 60123456789, 012-3456789, 012-345 6789
    const phoneRegex = /^(\+?6?01)[0-46-9]-?[0-9]{7,8}$/
    if (!phone.trim()) {
      setPhoneError('Phone number is required')
      return false
    }
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setPhoneError('Invalid Malaysian phone format (e.g., 012-3456789)')
      return false
    }
    setPhoneError('')
    return true
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset values
      setEditPhone(technician?.phone || '')
      setPhoneError('')
    }
    setIsEditing(!isEditing)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEditPhone(value)
    // Clear error when user starts typing
    if (phoneError) {
      validatePhone(value)
    }
  }

  const handlePhoneBlur = () => {
    if (editPhone.trim()) {
      validatePhone(editPhone)
    }
  }

  const handleSave = async () => {
    if (!validatePhone(editPhone)) {
      return
    }

    if (!technician) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('technicians')
        .update({ phone: editPhone })
        .eq('id', technician.id)

      if (error) throw error

      // Update local state
      setTechnician({ ...technician, phone: editPhone })
      setIsEditing(false)
      setPhoneError('')
      alert('Phone number updated successfully!')
    } catch (error) {
      console.error('Error updating phone:', error)
      alert('Failed to update phone number')
    } finally {
      setSaving(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  if (!technician) {
    return (
      <div className="pb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Profile</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">👤</div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Profile Found</h3>
          <p className="text-gray-500 text-sm">
            Unable to load technician profile data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">My Profile</h2>

      {/* Profile Avatar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">👤</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800">{technician.name}</h3>
          <span className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${
            technician.is_active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {technician.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Profile Info Cards */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {/* Name */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Name</span>
              <p className="text-gray-800 font-medium">{technician.name}</p>
            </div>
            <span className="text-2xl">📛</span>
          </div>
        </div>

        {/* Phone */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="text-sm text-gray-500">Phone Number</span>
              {isEditing ? (
                <div className="mt-2">
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    className={`w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      phoneError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="012-3456789"
                    disabled={saving}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-800 font-medium">
                  {technician.phone || 'Not set'}
                </p>
              )}
            </div>
            <div className="ml-4">
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleEditToggle}
                    disabled={saving}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !!phoneError}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEditToggle}
                  className="px-3 py-1 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                >
                  Edit
                </button>
              )}
            </div>
            <span className="text-2xl ml-2">📞</span>
          </div>
        </div>

        {/* Branch ID */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Branch ID</span>
              <p className="text-gray-800 font-medium">
                {technician.branch_id || 'Not assigned'}
              </p>
            </div>
            <span className="text-2xl">🏢</span>
          </div>
        </div>

        {/* Active Status */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Account Status</span>
              <p className="text-gray-800 font-medium">
                {technician.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <span className="text-2xl">
              {technician.is_active ? '✅' : '❌'}
            </span>
          </div>
        </div>

        {/* Created Date */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Member Since</span>
              <p className="text-gray-800 font-medium">
                {formatDate(technician.created_at)}
              </p>
            </div>
            <span className="text-2xl">📅</span>
          </div>
        </div>
      </div>

      {/* Navigation Hint */}
      <div className="mt-4 text-center">
        <a
          href="/technician/jobs"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to My Jobs
        </a>
      </div>
    </div>
  )
}
