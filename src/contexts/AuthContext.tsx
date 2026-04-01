import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { User, UserRole } from '../lib/supabase'

// Hardcoded assessor credentials
const ASSESSOR_CREDENTIALS = {
  id: 'admin',
  password: "diN2'3;r;R4N"
}

// Session storage key for authentication state
const SESSION_AUTH_KEY = 'ac_ops_authenticated'

// Mock users data from database seed
const MOCK_USERS: User[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Admin User',
    role: 'admin',
    technician_id: null,
    created_at: new Date().toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Manager User',
    role: 'manager',
    technician_id: null,
    created_at: new Date().toISOString()
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Ali (Tech)',
    role: 'technician',
    technician_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    created_at: new Date().toISOString()
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'John (Tech)',
    role: 'technician',
    technician_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    created_at: new Date().toISOString()
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'Bala (Tech)',
    role: 'technician',
    technician_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    created_at: new Date().toISOString()
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    name: 'Yusoff (Tech)',
    role: 'technician',
    technician_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    created_at: new Date().toISOString()
  }
]

interface AuthContextType {
  user: User | null
  switchRole: (role: UserRole) => void
  availableRoles: UserRole[]
  currentRole: UserRole | null
  isAuthenticated: boolean
  login: (id: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Default to admin user
  const [user, setUser] = useState<User | null>(MOCK_USERS[0])
  
  // Current role derived from URL path
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  
  // Authentication state - initialized from sessionStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true'
    }
    return false
  })

  // Update currentRole based on URL path
  useEffect(() => {
    const path = location.pathname
    console.log('[AuthContext] useEffect running, path:', path)
    if (path.startsWith('/admin')) {
      setCurrentRole('admin')
    } else if (path.startsWith('/manager')) {
      setCurrentRole('manager')
    } else if (path.startsWith('/technician')) {
      setCurrentRole('technician')
    }
  }, [location.pathname])

  const switchRole = (role: UserRole) => {
    console.log('[AuthContext] switchRole called with:', role)
    // Find the first user with the selected role
    const userWithRole = MOCK_USERS.find(u => u.role === role)
    if (userWithRole) {
      console.log('[AuthContext] Setting user to:', userWithRole.name, 'role:', userWithRole.role)
      setUser(userWithRole)
      // Also explicitly set currentRole to prevent timing issues during navigation
      setCurrentRole(role)
      // Navigate to the role's default route
      switch (role) {
        case 'admin':
          console.log('[AuthContext] Navigating to /admin/orders')
          navigate('/admin/orders')
          break
        case 'manager':
          console.log('[AuthContext] Navigating to /manager/dashboard')
          navigate('/manager/dashboard')
          break
        case 'technician':
          console.log('[AuthContext] Navigating to /technician/jobs')
          navigate('/technician/jobs')
          break
      }
    }
  }

  const login = (id: string, password: string): boolean => {
    console.log('[AuthContext] Login attempt with id:', id)
    
    // Check against hardcoded credentials
    if (id === ASSESSOR_CREDENTIALS.id && password === ASSESSOR_CREDENTIALS.password) {
      console.log('[AuthContext] Login successful')
      setIsAuthenticated(true)
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true')
      return true
    }
    
    console.log('[AuthContext] Login failed - invalid credentials')
    return false
  }

  const logout = (): void => {
    console.log('[AuthContext] Logout called')
    setIsAuthenticated(false)
    sessionStorage.removeItem(SESSION_AUTH_KEY)
    navigate('/login', { replace: true })
  }

  const availableRoles: UserRole[] = ['admin', 'manager', 'technician']

  return (
    <AuthContext.Provider value={{ 
      user, 
      switchRole, 
      availableRoles, 
      currentRole,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
