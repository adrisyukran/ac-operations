export default function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h2>
      <p className="text-gray-600 mb-6">Overview of operations and key metrics</p>
      
      {/* Placeholder content */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Dashboard Coming Soon</h3>
        <p className="text-gray-500 text-sm">
          This page will display key metrics, charts, and operational insights.
        </p>
      </div>

      {/* Sample placeholder metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">24</div>
          <div className="text-sm text-blue-600">Total Orders</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">8</div>
          <div className="text-sm text-yellow-600">Pending Jobs</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">12</div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-700">4</div>
          <div className="text-sm text-purple-600">Active Technicians</div>
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Recent Activity</h3>
        <div className="space-y-2">
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
            <span className="font-medium">ORD-004</span> marked as <span className="text-green-600">Job Done</span> by Yusoff
          </div>
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
            <span className="font-medium">ORD-003</span> status changed to <span className="text-purple-600">In Progress</span>
          </div>
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
            <span className="font-medium">ORD-002</span> assigned to <span className="text-blue-600">John</span>
          </div>
        </div>
      </div>
    </div>
  )
}