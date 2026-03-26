import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Order, Technician } from '../../lib/supabase'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nextOrderNo, setNextOrderNo] = useState('ORD-001')

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
      .select('*, technicians(name)')
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

  // Generate next order number
  async function generateOrderNo() {
    const { data, error } = await supabase
      .from('orders')
      .select('order_no')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      setNextOrderNo('ORD-001')
      return
    }

    const lastOrderNo = data[0].order_no
    const lastNum = parseInt(lastOrderNo.replace('ORD-', ''), 10)
    const nextNum = lastNum + 1
    setNextOrderNo(`ORD-${String(nextNum).padStart(3, '0')}`)
  }

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      await Promise.all([fetchOrders(), fetchTechnicians(), generateOrderNo()])
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
    setSubmitting(true)

    const orderData = {
      order_no: nextOrderNo,
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

    await Promise.all([fetchOrders(), generateOrderNo()])
    setSubmitting(false)
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
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Orders</h2>
      <p className="text-gray-600 mb-6">Manage and track all service orders</p>

      {/* Order Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Order</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Number (auto-generated, read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
              <input
                type="text"
                value={nextOrderNo}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
              />
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
              <select
                name="service_type"
                value={form.service_type}
                onChange={handleChange}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">All Orders</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No orders yet. Create your first order above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_no}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.customer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer_phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(order as any).technicians?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-MY')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
