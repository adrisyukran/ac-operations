import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Order, Technician } from '../../lib/supabase'
import { generateWhatsAppLink } from '../../lib/whatsapp'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nextOrderNo, setNextOrderNo] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterServiceType, setFilterServiceType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    // Search filter (order number or customer name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchOrderNo = order.order_no?.toLowerCase().includes(query)
      const matchCustomerName = order.customer_name?.toLowerCase().includes(query)
      if (!matchOrderNo && !matchCustomerName) return false
    }
    // Service type filter
    if (filterServiceType && order.service_type !== filterServiceType) {
      return false
    }
    // Status filter
    if (filterStatus && order.status !== filterStatus) {
      return false
    }
    return true
  })

  // Clear all filters
  function clearFilters() {
    setSearchQuery('')
    setFilterServiceType('')
    setFilterStatus('')
  }

  // Form state
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    problem_description: '',
    service_type: '',
    quoted_price: '',
    technician_id: '',
  })

  // Fetch orders with technician names
  async function fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, technicians(id, name, phone)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return
    }

    setOrders(data || [])
  }

  // Fetch technicians
  async function fetchTechnicians() {
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching technicians:', error)
      return
    }

    setTechnicians(data || [])
  }

  // Generate next order number based on service type and current date
  // Format: {PREFIX}{DDMM}-{SEQ} e.g., REP2703-001
  async function generateOrderNo(serviceType: string) {
    if (!serviceType) {
      setNextOrderNo(null)
      return
    }

    try {
      // Call the database function to get the next order number
      const { data, error } = await supabase.rpc('get_next_order_number', {
        p_service_type: serviceType,
      })

      if (error || !data) {
        console.error('Error generating order number:', error)
        // Fallback: generate a basic order number
        const prefix = serviceType.substring(0, 3).toUpperCase()
        const now = new Date()
        const dateStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0')
        setNextOrderNo(`${prefix}${dateStr}-001`)
        return
      }

      setNextOrderNo(data)
    } catch (err) {
      console.error('Error generating order number:', err)
      const prefix = serviceType.substring(0, 3).toUpperCase()
      const now = new Date()
      const dateStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0')
      setNextOrderNo(`${prefix}${dateStr}-001`)
    }
  }

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      await Promise.all([fetchOrders(), fetchTechnicians()])
      setLoading(false)
    }
    loadData()
  }, [])

  // Handle form input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!form.service_type) {
      alert('Please select a service type')
      return
    }

    setSubmitting(true)

    // Generate order number at submission time to handle concurrency
    let orderNumber = nextOrderNo
    if (!orderNumber) {
      orderNumber = await generateOrderNumberSync(form.service_type)
    }

    const orderData = {
      order_no: orderNumber,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      customer_address: form.customer_address || null,
      problem_description: form.problem_description || null,
      service_type: form.service_type || null,
      quoted_price: form.quoted_price ? parseFloat(form.quoted_price) : null,
      technician_id: form.technician_id || null,
      status: form.technician_id ? 'assigned' : 'new',
    }

    const { error } = await supabase.from('orders').insert(orderData)

    if (error) {
      console.error('Error creating order:', error)
      alert('Failed to create order: ' + error.message)
      setSubmitting(false)
      return
    }

    // Reset form and refresh data
    setForm({
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      problem_description: '',
      service_type: '',
      quoted_price: '',
      technician_id: '',
    })

    await Promise.all([fetchOrders(), generateOrderNo(form.service_type)])
    setSubmitting(false)
  }

  // Synchronous version of generateOrderNo for use in handleSubmit
  async function generateOrderNumberSync(serviceType: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('get_next_order_number', {
        p_service_type: serviceType,
      })

      if (error || !data) {
        console.error('Error generating order number:', error)
        const prefix = serviceType.substring(0, 3).toUpperCase()
        const now = new Date()
        const dateStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0')
        return `${prefix}${dateStr}-001`
      }

      return data
    } catch (err) {
      console.error('Error generating order number:', err)
      const prefix = serviceType.substring(0, 3).toUpperCase()
      const now = new Date()
      const dateStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0')
      return `${prefix}${dateStr}-001`
    }
  }

  // Get status badge styles
  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-orange-100 text-orange-800',
      job_done: 'bg-green-100 text-green-800',
      reviewed: 'bg-purple-100 text-purple-800',
      closed: 'bg-gray-100 text-gray-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  // Format status for display
  function formatStatus(status: string) {
    return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="w-full min-w-0">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Orders</h2>
      <p className="text-gray-600 mb-6">Manage and track all service orders</p>

      {/* Order Form */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Order</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Number (auto-generated, read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <input
                type="text"
                value={nextOrderNo || 'Select service type to generate'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated based on service type and date</p>
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input
                type="text"
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                required
                placeholder="e.g. Ahmad bin Abu"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                name="customer_phone"
                value={form.customer_phone}
                onChange={handleChange}
                placeholder="e.g. +6012-3456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
              <select
                name="service_type"
                value={form.service_type}
                onChange={(e) => {
                  handleChange(e)
                  // Generate order number when service type is selected
                  if (e.target.value) {
                    generateOrderNo(e.target.value)
                  } else {
                    setNextOrderNo(null)
                  }
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type...</option>
                <option value="repair">Repair</option>
                <option value="service">Service</option>
                <option value="installation">Installation</option>
              </select>
            </div>

            {/* Quoted Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quoted Price (RM)</label>
              <input
                type="number"
                name="quoted_price"
                value={form.quoted_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="e.g. 150.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Technician Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Technician</label>
              <select
                name="technician_id"
                value={form.technician_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Customer Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              name="customer_address"
              value={form.customer_address}
              onChange={handleChange}
              placeholder="e.g. No. 12, Jalan Masjid, Kuala Lumpur"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Problem Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problem Description</label>
            <textarea
              name="problem_description"
              value={form.problem_description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the AC issue..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">All Orders</h3>
        </div>

        {/* Filter Bar */}
        <div className="px-4 md:px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by order number or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Service Type Filter */}
            <select
              value={filterServiceType}
              onChange={(e) => setFilterServiceType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[140px]"
            >
              <option value="">All Services</option>
              <option value="repair">Repair</option>
              <option value="service">Service</option>
              <option value="installation">Installation</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-[140px]"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="job_done">Job Done</option>
              <option value="reviewed">Reviewed</option>
              <option value="closed">Closed</option>
            </select>

            {/* Clear Filters Button */}
            {(searchQuery || filterServiceType || filterStatus) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders yet. Create your first order above.</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders match your filters.</div>
        ) : (
          <>
            {/* Results count */}
            <div className="px-4 md:px-6 py-2 text-sm text-gray-500 bg-gray-50">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Technician</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_no}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.customer_name}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{order.customer_phone || '-'}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {(order as any).technicians?.name || '-'}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {new Date(order.created_at).toLocaleDateString('en-MY')}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-wrap gap-1">
                          {/* WhatsApp Technician Button */}
                          {(order as any).technicians?.phone && (
                            <a
                              href={generateWhatsAppLink(
                                (order as any).technicians.phone,
                                `Hi ${(order as any).technicians.name}, you have a new job assignment!\nOrder No: ${order.order_no}\nCustomer: ${order.customer_name}\nAddress: ${order.customer_address || 'N/A'}\nProblem: ${order.problem_description || 'N/A'}\nPlease confirm receipt.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                              📱 Tech
                            </a>
                          )}
                          {/* WhatsApp Customer Button */}
                          {order.customer_phone && (
                            <a
                              href={generateWhatsAppLink(
                                order.customer_phone,
                                `Hi ${order.customer_name}, your AC service has been assigned!\nOrder No: ${order.order_no}\nTechnician: ${(order as any).technicians?.name || 'TBD'}\nWe will contact you soon to schedule an appointment.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              📱 Customer
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
