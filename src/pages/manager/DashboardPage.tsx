import { useState, useEffect } from 'react'
import { supabase, type Technician } from '../../lib/supabase'

interface DashboardStats {
  totalJobsCompleted: number
  revenueToday: number
  revenueThisWeek: number
}

interface TechnicianStats {
  id: string
  name: string
  jobsCompleted: number
  totalRevenue: number
}

interface RecentJob {
  id: string
  orderNo: string
  customerName: string
  technicianName: string
  finalAmount: number
  completedAt: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobsCompleted: 0,
    revenueToday: 0,
    revenueThisWeek: 0,
  })
  const [technicianLeaderboard, setTechnicianLeaderboard] = useState<TechnicianStats[]>([])
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch all stats in parallel
      const [jobsResult, todayResult, weekResult, leaderboardResult, recentResult] = await Promise.all([
        // Total jobs completed
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'job_done'),

        // Revenue today
        supabase
          .from('orders')
          .select('final_amount')
          .eq('status', 'job_done')
          .gte('updated_at', new Date().toISOString().split('T')[0]),

        // Revenue this week (start of week)
        supabase
          .from('orders')
          .select('final_amount')
          .eq('status', 'job_done')
          .gte('updated_at', getStartOfWeek()),

        // Technician leaderboard
        supabase
          .from('orders')
          .select(`
            technician_id,
            final_amount,
            technicians!inner (
              id,
              name
            )
          `)
          .eq('status', 'job_done'),

        // Recent completed jobs
        supabase
          .from('orders')
          .select(`
            id,
            order_no,
            customer_name,
            final_amount,
            updated_at,
            technicians (
              name
            )
          `)
          .eq('status', 'job_done')
          .order('updated_at', { ascending: false })
          .limit(5),
      ])

      // Check for errors
      if (jobsResult.error) throw jobsResult.error
      if (todayResult.error) throw todayResult.error
      if (weekResult.error) throw weekResult.error
      if (leaderboardResult.error) throw leaderboardResult.error
      if (recentResult.error) throw recentResult.error

      // Calculate stats
      const totalJobsCompleted = jobsResult.count || 0

      const revenueToday = (todayResult.data || []).reduce(
        (sum, order) => sum + (order.final_amount || 0),
        0
      )

      const revenueThisWeek = (weekResult.data || []).reduce(
        (sum, order) => sum + (order.final_amount || 0),
        0
      )

      setStats({
        totalJobsCompleted,
        revenueToday,
        revenueThisWeek,
      })

      // Process technician leaderboard
      const techMap = new Map<string, { name: string; jobs: number; revenue: number }>()

      for (const order of leaderboardResult.data || []) {
        const techId = order.technician_id
        const techName = (order.technicians as unknown as Technician)?.name || 'Unknown'

        if (!techMap.has(techId)) {
          techMap.set(techId, { name: techName, jobs: 0, revenue: 0 })
        }

        const tech = techMap.get(techId)!
        tech.jobs += 1
        tech.revenue += order.final_amount || 0
      }

      const leaderboard: TechnicianStats[] = Array.from(techMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          jobsCompleted: data.jobs,
          totalRevenue: data.revenue,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)

      setTechnicianLeaderboard(leaderboard)

      // Process recent jobs
      const recent: RecentJob[] = (recentResult.data || []).map((order) => ({
        id: order.id,
        orderNo: order.order_no,
        customerName: order.customer_name,
        technicianName: (order.technicians as unknown as Technician)?.name || 'Unknown',
        finalAmount: order.final_amount || 0,
        completedAt: order.updated_at,
      }))

      setRecentJobs(recent)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  function getStartOfWeek(): string {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
    const startOfWeek = new Date(now.setDate(diff))
    startOfWeek.setHours(0, 0, 0, 0)
    return startOfWeek.toISOString()
  }

  function formatCurrency(amount: number): string {
    return `RM ${amount.toFixed(2)}`
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Manager Dashboard</h2>
      <p className="text-gray-600 mb-6">Performance metrics and team overview</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-3xl">✅</div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalJobsCompleted}</div>
              <div className="text-sm text-gray-500">Total Jobs Completed</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-3xl">💰</div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenueToday)}</div>
              <div className="text-sm text-gray-500">Revenue Today</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📈</div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.revenueThisWeek)}</div>
              <div className="text-sm text-gray-500">Revenue This Week</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technician Leaderboard */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Technician Leaderboard</h3>

        {technicianLeaderboard.length === 0 ? (
          <p className="text-gray-500 text-sm">No completed jobs yet</p>
        ) : (
          <div className="space-y-3">
            {technicianLeaderboard.map((tech, index) => (
              <div
                key={tech.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : index === 1
                        ? 'bg-gray-100 text-gray-600'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{tech.name}</div>
                    <div className="text-sm text-gray-500">{tech.jobsCompleted} jobs completed</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">{formatCurrency(tech.totalRevenue)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Recent Completed Jobs</h3>

        {recentJobs.length === 0 ? (
          <p className="text-gray-500 text-sm">No completed jobs yet</p>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-800">
                    {job.orderNo} - {job.customerName}
                  </div>
                  <div className="text-sm text-gray-500">
                    Completed by {job.technicianName} • {formatDate(job.completedAt)}
                  </div>
                </div>
                <div className="font-semibold text-green-600">
                  {formatCurrency(job.finalAmount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
