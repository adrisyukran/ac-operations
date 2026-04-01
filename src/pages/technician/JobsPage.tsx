import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Order } from '../../lib/supabase'
import { generateWhatsAppLink } from '../../lib/whatsapp'

type ViewMode = 'list' | 'detail'

export default function JobsPage() {
  const { user, currentRole } = useAuth()
  const [jobs, setJobs] = useState<Order[]>([])
  const [selectedJob, setSelectedJob] = useState<Order | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCompletionForm, setShowCompletionForm] = useState(false)
  
  // Completion form state
  const [workDone, setWorkDone] = useState('')
  const [extraCharges, setExtraCharges] = useState(0)
  const [remarks, setRemarks] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch jobs assigned to current technician
  // Depend on currentRole to ensure refetch when role context changes during navigation
  useEffect(() => {
    fetchJobs()
  }, [user, currentRole])

  const fetchJobs = async () => {
    if (!user?.technician_id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('technician_id', user.technician_id)
        .in('status', ['assigned', 'in_progress', 'job_done'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJobSelect = (job: Order) => {
    setSelectedJob(job)
    setViewMode('detail')
    setShowCompletionForm(false)
    // Reset form
    setWorkDone('')
    setExtraCharges(0)
    setRemarks('')
    setPhotos([])
    setPhotoPreviews([])
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedJob(null)
    setShowCompletionForm(false)
  }

  const handleStartJob = async () => {
    if (!selectedJob) return
    
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', selectedJob.id)

      if (error) throw error
      
      const updatedJob = { ...selectedJob, status: 'in_progress' as const }
      setSelectedJob(updatedJob)
      setJobs(jobs.map(j => j.id === selectedJob.id ? updatedJob : j))
    } catch (error) {
      console.error('Error starting job:', error)
      alert('Failed to start job')
    } finally {
      setUpdating(false)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    
    if (photos.length + imageFiles.length > 6) {
      alert('Maximum 6 photos allowed')
      return
    }

    setPhotos([...photos, ...imageFiles])
    
    // Create previews
    imageFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))
  }

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []
    
    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${selectedJob?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('job-photos')
        .upload(fileName, photo)

      if (error) {
        console.error('Error uploading photo:', error)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName)
      
      uploadedUrls.push(publicUrl)
    }
    
    return uploadedUrls
  }

  const handleCompleteJob = async () => {
    if (!selectedJob) return
    if (!workDone.trim()) {
      alert('Please describe the work done')
      return
    }

    setUpdating(true)
    try {
      // Upload photos first
      const photoUrls = await uploadPhotos()
      
      const finalAmount = (selectedJob.quoted_price || 0) + extraCharges
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'job_done',
          work_done: workDone,
          extra_charges: extraCharges,
          remarks: remarks,
          final_amount: finalAmount,
          photo_urls: photoUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedJob.id)

      if (error) throw error
      
      alert('Job completed successfully!')
      fetchJobs()
      handleBackToList()
    } catch (error) {
      console.error('Error completing job:', error)
      alert('Failed to complete job')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      job_done: 'bg-green-100 text-green-800',
      reviewed: 'bg-purple-100 text-purple-800'
    }
    const labels: Record<string, string> = {
      assigned: 'Assigned',
      in_progress: 'In Progress',
      job_done: 'Completed',
      reviewed: 'Reviewed'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  // Generate WhatsApp link for appointment setting
  const getAppointmentWhatsAppLink = (job: Order): string => {
    const message = `Hi ${job.customer_name}, this is ${user?.name || 'the technician'} from AC Operations.
Regarding your AC service (Order #${job.order_no}):

I'd like to schedule an appointment to service your unit. 
Please let me know your preferred date and time.

Thank you!`
    return generateWhatsAppLink(job.customer_phone || '', message)
  }

  // Generate WhatsApp link for requesting feedback
  const getFeedbackWhatsAppLink = (job: Order): string => {
    const message = `Hi ${job.customer_name}, thank you for choosing AC Operations!
Your service (Order #${job.order_no}) has been completed.

We would greatly appreciate your feedback on our service.
Please share your experience with us.

Thank you for your valued feedback!`
    return generateWhatsAppLink(job.customer_phone || '', message)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading jobs...</div>
      </div>
    )
  }

  // Job List View
  if (viewMode === 'list') {
    return (
      <div className="pb-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4">My Jobs</h2>
        
        {jobs.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Active Jobs</h3>
            <p className="text-gray-500 text-sm">
              You don't have any assigned jobs at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => handleJobSelect(job)}
                className="bg-white border border-gray-200 rounded-lg p-4 active:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{job.order_no}</span>
                  {getStatusBadge(job.status)}
                </div>
                <div className="text-sm text-gray-700 font-medium mb-1">{job.customer_name}</div>
                <div className="text-sm text-gray-500 mb-2">{job.customer_address}</div>
                <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                  <span className="font-medium">Service:</span> {job.service_type || 'N/A'}
                </div>

                {/* WhatsApp Action Buttons */}
                {job.customer_phone && (
                  <div className="flex gap-2 mt-3">
                    {job.status !== 'job_done' && job.status !== 'reviewed' && (
                      <a
                        href={getAppointmentWhatsAppLink(job)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-medium active:bg-green-600"
                      >
                        📱 Appointment
                      </a>
                    )}
                    {(job.status === 'job_done' || job.status === 'reviewed') && (
                      <a
                        href={getFeedbackWhatsAppLink(job)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white py-2 px-3 rounded-lg text-xs font-medium active:bg-green-700"
                      >
                        ⭐ Feedback
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Job Detail View
  if (!selectedJob) return null

  const finalAmount = (selectedJob.quoted_price || 0) + extraCharges

  return (
    <div className="pb-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBackToList}
          className="text-blue-600 font-medium"
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-800">{selectedJob.order_no}</h2>
        {getStatusBadge(selectedJob.status)}
      </div>

      {/* Job Details Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-gray-800 mb-3">Customer Details</h3>
        
        <div className="space-y-2">
          <div>
            <span className="text-sm text-gray-500">Name</span>
            <p className="text-gray-800">{selectedJob.customer_name}</p>
          </div>
          
          {selectedJob.customer_phone && (
            <div>
              <span className="text-sm text-gray-500">Phone</span>
              <a
                href={`tel:${selectedJob.customer_phone}`}
                className="block text-blue-600 font-medium"
              >
                📞 {selectedJob.customer_phone}
              </a>
            </div>
          )}
          
          <div>
            <span className="text-sm text-gray-500">Address</span>
            <p className="text-gray-800">{selectedJob.customer_address || 'N/A'}</p>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Problem</span>
            <p className="text-gray-800">{selectedJob.problem_description || 'N/A'}</p>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Service Type</span>
            <p className="text-gray-800">{selectedJob.service_type || 'N/A'}</p>
          </div>
          
          <div>
            <span className="text-sm text-gray-500">Quoted Price</span>
            <p className="text-gray-800 font-medium">RM {(selectedJob.quoted_price || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!showCompletionForm && (
        <div className="space-y-3">
          {selectedJob.status === 'assigned' && (
            <button
              onClick={handleStartJob}
              disabled={updating}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 active:bg-blue-700"
            >
              {updating ? 'Starting...' : 'Start Job'}
            </button>
          )}
          
          {selectedJob.status === 'in_progress' && (
            <button
              onClick={() => setShowCompletionForm(true)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium active:bg-green-700"
            >
              Complete Job
            </button>
          )}

          {/* WhatsApp Action Buttons */}
          {selectedJob.customer_phone && (
            <div className="space-y-2">
              {selectedJob.status !== 'job_done' && selectedJob.status !== 'reviewed' && (
                <a
                  href={getAppointmentWhatsAppLink(selectedJob)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-3 rounded-lg font-medium active:bg-green-600"
                >
                  📱 Schedule Appointment
                </a>
              )}
              {(selectedJob.status === 'job_done' || selectedJob.status === 'reviewed') && (
                <a
                  href={getFeedbackWhatsAppLink(selectedJob)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3 rounded-lg font-medium active:bg-green-700"
                >
                  ⭐ Request Feedback
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completion Form */}
      {showCompletionForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Job Completion</h3>
          
          <div className="space-y-4">
            {/* Work Done */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Done *
              </label>
              <textarea
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the work completed..."
              />
            </div>

            {/* Extra Charges */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Charges (RM)
              </label>
              <input
                type="number"
                value={extraCharges}
                onChange={(e) => setExtraCharges(Number(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes..."
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos (max 6)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= 6}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 text-sm disabled:opacity-50 active:bg-gray-50"
              >
                📷 Tap to add photos ({photos.length}/6)
              </button>
              
              {/* Photo Previews */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Final Amount Display */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Quoted Price:</span>
                <span>RM {(selectedJob.quoted_price || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Extra Charges:</span>
                <span>RM {extraCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-2">
                <span>Final Amount:</span>
                <span className="text-green-600">RM {finalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCompletionForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium active:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteJob}
                disabled={updating || !workDone.trim()}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 active:bg-green-700"
              >
                {updating ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
