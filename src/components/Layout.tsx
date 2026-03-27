import { ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../lib/supabase'

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  label: string
  path: string
  icon: string
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Orders', path: '/admin/orders', icon: '📋' },
  { label: 'Technicians', path: '/admin/technicians', icon: '👷' }
]

const TECHNICIAN_NAV: NavItem[] = [
  { label: 'My Jobs', path: '/technician/jobs', icon: '🔧' },
  { label: 'Profile', path: '/technician/profile', icon: '👤' }
]

const MANAGER_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/manager/dashboard', icon: '📊' },
  { label: 'Reports', path: '/manager/reports', icon: '📈' }
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'admin':
      return ADMIN_NAV
    case 'technician':
      return TECHNICIAN_NAV
    case 'manager':
      return MANAGER_NAV
    default:
      return []
  }
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const { user, switchRole, availableRoles, currentRole } = useAuth()
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!user) return null

  // Use currentRole derived from URL path, fallback to user.role
  const activeRole = currentRole || user.role
  const navItems = getNavItems(activeRole)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and App Name */}
            <div className="flex items-center">
              <span className="text-2xl mr-2">❄️</span>
              <h1 className="text-xl font-bold">Sejuk Sejuk Operations</h1>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-blue-700"
            >
              <span className="text-xl">☰</span>
            </button>

            {/* Role Switcher (Desktop) */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 rounded-lg hover:bg-blue-800 transition"
              >
                <span className="text-sm">👤 {user.name}</span>
                <span className="text-xs bg-blue-900 px-2 py-1 rounded">{activeRole}</span>
                <span className="text-xs">▼</span>
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-xs text-gray-500 font-semibold">
                      Switch Role
                    </div>
                    {availableRoles.map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          switchRole(role)
                          setIsRoleDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition ${
                          activeRole === role
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                        {activeRole === role && ' ✓'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="mb-4">
                <div className="text-sm opacity-90">Logged in as:</div>
                <div className="font-medium">{user.name}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                      activeRole === role
                        ? 'bg-white text-blue-700'
                        : 'bg-blue-700 text-white hover:bg-blue-800'
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar (Desktop) */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow">
              <ul className="p-2 space-y-1">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow p-4 md:p-6 min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <ul className="flex justify-around py-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <button
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center px-4 py-2 text-gray-600 hover:text-blue-600 transition"
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom spacer for mobile nav */}
      <div className="md:hidden h-16" />
    </div>
  )
}