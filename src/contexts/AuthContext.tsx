import { createContext, useContext, useState, ReactNode } from 'react'
import { User, UserRole } from '../lib/supabase'

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default to admin user
  const [user, setUser] = useState<User | null>(MOCK_USERS[0])

  const switchRole = (role: UserRole) => {
    // Find the first user with the selected role
    const userWithRole = MOCK_USERS.find(u => u.role === role)
    if (userWithRole) {
      setUser(userWithRole)
    }
  }

  const availableRoles: UserRole[] = ['admin', 'manager', 'technician']

  return (
    <AuthContext.Provider value={{ user, switchRole, availableRoles }}>
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