export default function OrdersPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Orders</h2>
      <p className="text-gray-600 mb-6">Manage and track all service orders</p>
      
      {/* Placeholder content */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Orders List Coming Soon</h3>
        <p className="text-gray-500 text-sm">
          This page will display all service orders with filtering and status management.
        </p>
      </div>

      {/* Sample placeholder orders */}
      <div className="mt-6 space-y-3">
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">ORD-001</div>
            <div className="text-sm text-gray-500">Ahmad bin Abu - AC tidak sejuk</div>
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">New</span>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">ORD-002</div>
            <div className="text-sm text-gray-500">Siti Nurhaliza - AC bocor air</div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Assigned</span>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800">ORD-003</div>
            <div className="text-sm text-gray-500">Mohd Razif - Servis tahunan</div>
          </div>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">In Progress</span>
        </div>
      </div>
    </div>
  )
}