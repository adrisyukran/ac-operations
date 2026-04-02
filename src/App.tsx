import { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/admin/OrdersPage'
import JobsPage from './pages/technician/JobsPage'
import ProfilePage from './pages/technician/ProfilePage'
import DashboardPage from './pages/manager/DashboardPage'
import AIQueryPage from './pages/manager/AIQueryPage'
import AIFeaturesPage from './pages/manager/AIFeaturesPage'
import { Analytics } from "@vercel/analytics/next"

// ProtectedRoute wrapper - redirects to /login if not authenticated
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

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

// Home page - redirect to admin orders by default (after auth check)
function HomePage() {
  return <Navigate to="/admin/orders" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login route - NO Layout wrapper, NOT protected */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes - wrapped with ProtectedRoute and Layout */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin routes */}
      <Route 
        path="/admin/orders" 
        element={
          <ProtectedRoute>
            <Layout><OrdersPage /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/technicians" 
        element={
          <ProtectedRoute>
            <Layout><TechniciansPage /></Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Technician routes */}
      <Route 
        path="/technician/jobs" 
        element={
          <ProtectedRoute>
            <Layout><JobsPage /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/technician/profile" 
        element={
          <ProtectedRoute>
            <Layout><ProfilePage /></Layout>
          </ProtectedRoute>
        } 
      />
      
      {/* Manager routes */}
      <Route 
        path="/manager/dashboard" 
        element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manager/reports" 
        element={
          <ProtectedRoute>
            <Layout><ReportsPage /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manager/ai-query" 
        element={
          <ProtectedRoute>
            <Layout><AIQueryPage /></Layout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manager/ai-features" 
        element={
          <ProtectedRoute>
            <Layout><AIFeaturesPage /></Layout>
          </ProtectedRoute>
        } 
      />
      
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
        <Analytics/>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
