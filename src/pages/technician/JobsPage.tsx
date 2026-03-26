export default function JobsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">My Jobs</h2>
      <p className="text-gray-600 mb-6">View and manage your assigned service jobs</p>
      
      {/* Placeholder content */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🔧</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Jobs List Coming Soon</h3>
        <p className="text-gray-500 text-sm">
          This page will display jobs assigned to you with status updates and job details.
        </p>
      </div>

      {/* Sample placeholder jobs */}
      <div className="mt-6 space-y-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-800">ORD-001</div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">New</span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Ahmad bin Abu</div>
          <div className="text-sm text-gray-500 mb-2">No. 12, Jalan Masjid, Kuala Lumpur</div>
          <div className="text-sm text-gray-700 bg-white rounded p-2">
            <strong>Issue:</strong> AC tidak sejuk
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-gray-800">ORD-003</div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">In Progress</span>
          </div>
          <div className="text-sm text-gray-600 mb-1">Mohd Razif</div>
          <div className="text-sm text-gray-500 mb-2">No. 8, Jalan Selangor, Shah Alam</div>
          <div className="text-sm text-gray-700 bg-white rounded p-2">
            <strong>Issue:</strong> Servis tahunan
          </div>
        </div>
      </div>
    </div>
  )
}