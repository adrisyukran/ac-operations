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

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editForm, setEditForm] = useState<{
    customer_name?: string
    customer_phone?: string
    customer_address?: string
    problem_description?: string
    service_type?: string
    quoted_price?: string
    technician_id?: string
    status?: string
    work_done?: string
    extra_charges?: string
    remarks?: string
    final_amount?: string
  }>({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  // Format currency
  function formatCurrency(amount: number | null) {
    if (amount === null || amount === undefined) return '-'
    return `RM ${amount.toFixed(2)}`
  }

  // Format date
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get technician name from order
  function getTechnicianName(order: Order) {
    const tech = (order as any).technicians
    return tech?.name || 'Unassigned'
  }

  // Open order detail modal
  function openDetailModal(order: Order) {
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
    setIsEditMode(false)
    setShowDeleteConfirm(false)
    setEditForm({})
  }

  // Close modal
  function closeModal() {
    setIsDetailModalOpen(false)
    setSelectedOrder(null)
    setIsEditMode(false)
    setShowDeleteConfirm(false)
    setEditForm({})
  }

  // Start edit mode
  function startEditMode() {
    if (!selectedOrder) return
    setEditForm({
      customer_name: selectedOrder.customer_name,
      customer_phone: selectedOrder.customer_phone || '',
      customer_address: selectedOrder.customer_address || '',
      problem_description: selectedOrder.problem_description || '',
      service_type: selectedOrder.service_type || '',
      quoted_price: selectedOrder.quoted_price?.toString() ?? '',
      technician_id: selectedOrder.technician_id || '',
      status: selectedOrder.status,
      work_done: selectedOrder.work_done || '',
      extra_charges: selectedOrder.extra_charges?.toString() ?? '',
      remarks: selectedOrder.remarks || '',
      final_amount: selectedOrder.final_amount?.toString() ?? '',
    })
    setIsEditMode(true)
  }

  // Handle edit form changes
  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  // Save changes
  async function saveChanges() {
    if (!selectedOrder) return

    setIsDeleting(true)

    const updateData: Partial<Order> = {
      customer_name: editForm.customer_name || undefined,
      customer_phone: editForm.customer_phone || undefined,
      customer_address: editForm.customer_address || undefined,
      problem_description: editForm.problem_description || undefined,
      service_type: editForm.service_type || undefined,
      quoted_price: editForm.quoted_price ? parseFloat(editForm.quoted_price) : null,
      technician_id: editForm.technician_id || undefined,
      status: editForm.status as Order['status'],
      work_done: editForm.work_done || undefined,
      extra_charges: editForm.extra_charges ? parseFloat(editForm.extra_charges) : null,
      remarks: editForm.remarks || undefined,
      final_amount: editForm.final_amount ? parseFloat(editForm.final_amount) : null,
    }

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', selectedOrder.id)

    if (error) {
      console.error('Error updating order:', error)
      alert('Failed to update order: ' + error.message)
      setIsDeleting(false)
      return
    }

    await fetchOrders()
    closeModal()
    setIsDeleting(false)
  }

  // Confirm delete
  function confirmDelete() {
    setShowDeleteConfirm(true)
  }

  // Cancel delete
  function cancelDelete() {
    setShowDeleteConfirm(false)
  }

  // Delete order
  async function deleteOrder() {
    if (!selectedOrder) return

    setIsDeleting(true)

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', selectedOrder.id)

    if (error) {
      console.error('Error deleting order:', error)
      alert('Failed to delete order: ' + error.message)
      setIsDeleting(false)
      return
    }

    await fetchOrders()
    closeModal()
    setIsDeleting(false)
  }

  // Open modal in edit mode directly
  function openEditMode(order: Order, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
    setShowDeleteConfirm(false)
    startEditMode()
  }

  // Open delete confirm directly
  function openDeleteConfirm(order: Order, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
    setShowDeleteConfirm(true)
    setIsEditMode(false)
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
                    <tr 
                      key={order.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openDetailModal(order)}
                    >
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_no}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.customer_name}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{order.customer_phone || '-'}</td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                        {getTechnicianName(order)}
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
                        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Edit Button */}
                          <button
                            onClick={(e) => openEditMode(order, e)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-blue-600"
                            title="Edit Order"
                          >
                            ✏️
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={(e) => openDeleteConfirm(order, e)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 hover:text-red-600"
                            title="Delete Order"
                          >
                            🗑️
                          </button>
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
                              onClick={(e) => e.stopPropagation()}
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
                              onClick={(e) => e.stopPropagation()}
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

      {/* Order Detail Modal */}
      {isDetailModalOpen && selectedOrder && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeModal}
          />
          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order {selectedOrder.order_no}
                  </h3>
                  <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedOrder.status)}`}>
                    {formatStatus(selectedOrder.status)}
                  </span>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Delete Confirmation */}
              {showDeleteConfirm ? (
                <div className="p-6">
                  <div className="text-center">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Delete Order?</h4>
                    <p className="text-gray-600 mb-6">
                      Are you sure you want to delete order <strong>{selectedOrder.order_no}</strong>? 
                      This action cannot be undone.
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={cancelDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={deleteOrder}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isEditMode ? (
                /* Edit Form */
                <div className="p-6">
                  <form onSubmit={(e) => { e.preventDefault(); saveChanges(); }} className="space-y-4">
                    {/* Order Number (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                      <input
                        type="text"
                        value={selectedOrder.order_no}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                        <input
                          type="text"
                          name="customer_name"
                          value={editForm.customer_name || ''}
                          onChange={handleEditChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Customer Phone */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          name="customer_phone"
                          value={editForm.customer_phone || ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Service Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                        <select
                          name="service_type"
                          value={editForm.service_type || ''}
                          onChange={handleEditChange}
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
                          value={editForm.quoted_price || ''}
                          onChange={handleEditChange}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Technician Assignment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                        <select
                          name="technician_id"
                          value={editForm.technician_id || ''}
                          onChange={handleEditChange}
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

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          name="status"
                          value={editForm.status || ''}
                          onChange={handleEditChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="new">New</option>
                          <option value="assigned">Assigned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="job_done">Job Done</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    {/* Customer Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        name="customer_address"
                        value={editForm.customer_address || ''}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Problem Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Problem Description</label>
                      <textarea
                        name="problem_description"
                        value={editForm.problem_description || ''}
                        onChange={handleEditChange}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Completion Fields */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Completion Info</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Work Done */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Work Done</label>
                          <textarea
                            name="work_done"
                            value={editForm.work_done || ''}
                            onChange={handleEditChange}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Extra Charges */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Extra Charges (RM)</label>
                          <input
                            type="number"
                            name="extra_charges"
                            value={editForm.extra_charges || ''}
                            onChange={handleEditChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Final Amount */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Final Amount (RM)</label>
                          <input
                            type="number"
                            name="final_amount"
                            value={editForm.final_amount || ''}
                            onChange={handleEditChange}
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Remarks */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                          <textarea
                            name="remarks"
                            value={editForm.remarks || ''}
                            onChange={handleEditChange}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isDeleting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* View Mode */
                <div className="p-6">
                  {/* Customer Info */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Customer Info</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Name:</span>
                        <span className="text-sm text-gray-900 col-span-2">{selectedOrder.customer_name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Phone:</span>
                        <span className="text-sm text-gray-900 col-span-2">{selectedOrder.customer_phone || '-'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Address:</span>
                        <span className="text-sm text-gray-900 col-span-2">{selectedOrder.customer_address || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Service Info</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Service Type:</span>
                        <span className="text-sm text-gray-900 col-span-2 capitalize">{selectedOrder.service_type || '-'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Problem:</span>
                        <span className="text-sm text-gray-900 col-span-2">{selectedOrder.problem_description || '-'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Quoted Price:</span>
                        <span className="text-sm text-gray-900 col-span-2">{formatCurrency(selectedOrder.quoted_price)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Assignment</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Technician:</span>
                        <span className="text-sm text-gray-900 col-span-2">{getTechnicianName(selectedOrder)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Status:</span>
                        <span className="text-sm col-span-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedOrder.status)}`}>
                            {formatStatus(selectedOrder.status)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Completion Info */}
                  {(selectedOrder.work_done || selectedOrder.extra_charges || selectedOrder.final_amount || selectedOrder.remarks) && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Completion Info</h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        {selectedOrder.work_done && (
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-sm text-gray-500">Work Done:</span>
                            <span className="text-sm text-gray-900 col-span-2">{selectedOrder.work_done}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-sm text-gray-500">Extra Charges:</span>
                          <span className="text-sm text-gray-900 col-span-2">{formatCurrency(selectedOrder.extra_charges)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-sm text-gray-500">Final Amount:</span>
                          <span className="text-sm text-gray-900 col-span-2 font-semibold">{formatCurrency(selectedOrder.final_amount)}</span>
                        </div>
                        {selectedOrder.remarks && (
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-sm text-gray-500">Remarks:</span>
                            <span className="text-sm text-gray-900 col-span-2">{selectedOrder.remarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Timestamps</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Created:</span>
                        <span className="text-sm text-gray-900 col-span-2">{formatDate(selectedOrder.created_at)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-sm text-gray-500">Updated:</span>
                        <span className="text-sm text-gray-900 col-span-2">{formatDate(selectedOrder.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={startEditMode}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
