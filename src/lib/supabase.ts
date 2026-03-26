import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// These environment variables should be set in a .env file for local development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database schema
export type UserRole = 'admin' | 'technician' | 'manager'

export interface User {
  id: string
  name: string
  role: UserRole
  technician_id: string | null
  created_at: string
}

export interface Technician {
  id: string
  name: string
  phone: string | null
  branch_id: string | null
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string | null
  customer_address: string | null
  problem_description: string | null
  service_type: string | null
  quoted_price: number | null
  technician_id: string | null
  status: 'new' | 'assigned' | 'in_progress' | 'job_done' | 'reviewed' | 'closed'
  created_at: string
  updated_at: string
}