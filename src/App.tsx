import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import OrdersPage from './pages/admin/OrdersPage'
import JobsPage from './pages/technician/JobsPage'
import DashboardPage from './pages/manager/DashboardPage'

// Placeholder pages for additional routes
function TechniciansPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Technicians</h2>
      <p className="text-gray-600 mb-6">Manage technician accounts and assignments</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">👷</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Technicians List Coming Soon</h3>
        <p className="text-gray-500 text-sm">
          This page will display all technicians with their status and assignments.
        </p>
      </div>
    </div>
  )
}

function ProfilePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">My Profile</h2>
      <p className="text-gray-600 mb-6">View and update your profile information</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">👤</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Profile Coming Soon</h3>
        <p className="text-gray-500 text-sm">
          This page will allow technicians to view and update their profile.
        </p>
      </div>
    </div>
  )
}

function ReportsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Reports</h2>
      <p className="text-gray-600 mb-6">View operational reports and analytics</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Reports Coming Soon</h3>
        <p className="text-gray-500 text-sm">
          This page will display various operational reports and analytics.
        </p>
      </div>
    </div>
  )
}

// Home page that redirects based on role
function HomePage() {
  const { user } = useAuth()
  
  if (!user) return null
  
  // Redirect to appropriate page based on role
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/orders" replace />
    case 'technician':
      return <Navigate to="/technician/jobs" replace />
    case 'manager':
      return <Navigate to="/manager/dashboard" replace />
    default:
      return <Navigate to="/admin/orders" replace />
  }
}

function AppRoutes() {
  return (
    <Routes>
      {/* Home route - redirects based on role */}
      <Route path="/" element={<HomePage />} />
      
      {/* Admin routes */}
      <Route path="/admin/orders" element={<Layout><OrdersPage /></Layout>} />
      <Route path="/admin/technicians" element={<Layout><TechniciansPage /></Layout>} />
      
      {/* Technician routes */}
      <Route path="/technician/jobs" element={<Layout><JobsPage /></Layout>} />
      <Route path="/technician/profile" element={<Layout><ProfilePage /></Layout>} />
      
      {/* Manager routes */}
      <Route path="/manager/dashboard" element={<Layout><DashboardPage /></Layout>} />
      <Route path="/manager/reports" element={<Layout><ReportsPage /></Layout>} />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App