import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Truck, XCircle } from 'lucide-react'
import api from '../../api/client'

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed',
  partially_delivered: 'badge-partial', fully_delivered: 'badge-done', cancelled: 'badge-cancelled',
}[s] || 'badge-draft')

export default function SalesOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deliveries, setDeliveries] = useState({})

  const { data: order, isLoading } = useQuery({ queryKey: ['sales', id], queryFn: () => api.get(`/sales/${id}`).then(r => r.data) })

  const confirmMut = useMutation({ mutationFn: () => api.post(`/sales/${id}/confirm`), onSuccess: () => { qc.invalidateQueries(['sales', id]); toast.success('Confirmed') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })
  const cancelMut = useMutation({ mutationFn: () => api.post(`/sales/${id}/cancel`), onSuccess: () => { qc.invalidateQueries(['sales', id]); toast.success('Cancelled') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })
  const deliverMut = useMutation({
    mutationFn: () => api.post(`/sales/${id}/deliver`, {
      lines: Object.entries(deliveries).filter(([, qty]) => parseFloat(qty) > 0).map(([line_id, qty]) => ({ line_id, qty: parseFloat(qty) }))
    }),
    onSuccess: () => { qc.invalidateQueries(['sales', id]); setDeliveries({}); toast.success('Delivered') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  if (isLoading) return <div className="text-gray-500">Loading…</div>
  if (!order) return <div>Not found</div>

  return (
    <div>
      <button onClick={() => navigate('/sales')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} /> Back to Sales
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{order.name}</h2>
          <span className={`${statusBadge(order.status)} mt-1`}>{order.status.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex gap-2">
          {order.status === 'draft' && <button className="btn-primary flex items-center gap-2" onClick={() => confirmMut.mutate()}><CheckCircle size={16} /> Confirm</button>}
          {['confirmed', 'partially_delivered'].includes(order.status) && (
            <button className="btn-primary flex items-center gap-2" onClick={() => deliverMut.mutate()}>
              <Truck size={16} /> Record Delivery
            </button>
          )}
          {['draft', 'confirmed'].includes(order.status) && <button className="btn-danger flex items-center gap-2" onClick={() => cancelMut.mutate()}><XCircle size={16} /> Cancel</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Customer</div>
          <div className="font-semibold">{order.customer?.name}</div>
          {order.customer?.email && <div className="text-sm text-gray-500">{order.customer.email}</div>}
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Dates</div>
          <div className="text-sm"><span className="text-gray-500">Order:</span> {order.order_date}</div>
          {order.expected_delivery_date && <div className="text-sm"><span className="text-gray-500">Expected:</span> {order.expected_delivery_date}</div>}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Order Lines</h3>
        <table className="w-full">
          <thead>
            <tr className="text-xs font-semibold text-gray-500 uppercase border-b">
              <th className="pb-2 text-left">Product</th>
              <th className="pb-2 text-right">Ordered</th>
              <th className="pb-2 text-right">Delivered</th>
              <th className="pb-2 text-right">Remaining</th>
              <th className="pb-2 text-right">Price</th>
              <th className="pb-2 text-right">Subtotal</th>
              {['confirmed', 'partially_delivered'].includes(order.status) && <th className="pb-2 text-right">Deliver Qty</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.lines?.map(line => (
              <tr key={line.id}>
                <td className="py-3 font-medium">{line.product?.name}</td>
                <td className="py-3 text-right">{Number(line.qty_ordered).toFixed(0)}</td>
                <td className="py-3 text-right text-green-600">{Number(line.qty_delivered).toFixed(0)}</td>
                <td className="py-3 text-right text-orange-600">{Number(line.qty_remaining).toFixed(0)}</td>
                <td className="py-3 text-right">₹{Number(line.unit_price).toFixed(2)}</td>
                <td className="py-3 text-right font-semibold">₹{Number(line.subtotal).toFixed(2)}</td>
                {['confirmed', 'partially_delivered'].includes(order.status) && (
                  <td className="py-3 text-right">
                    <input
                      className="input w-20 text-right text-sm"
                      type="number"
                      min="0"
                      max={line.qty_remaining}
                      placeholder="0"
                      value={deliveries[line.id] || ''}
                      onChange={e => setDeliveries(d => ({ ...d, [line.id]: e.target.value }))}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
