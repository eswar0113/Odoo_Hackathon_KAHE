import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Truck, XCircle, Calendar, User, ShoppingCart } from 'lucide-react'
import api from '../../api/client'

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed',
  partially_delivered: 'badge-partial', fully_delivered: 'badge-done', cancelled: 'badge-cancelled',
}[s] || 'badge-draft')

const DetailSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-6 bg-slate-200 rounded w-1/8"></div>
    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
      <div className="space-y-2 w-1/3">
        <div className="h-8 bg-slate-200 rounded"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      </div>
      <div className="h-10 bg-slate-200 rounded w-1/4"></div>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div className="h-28 bg-slate-200 rounded-2xl"></div>
      <div className="h-28 bg-slate-200 rounded-2xl"></div>
    </div>
    <div className="h-60 bg-slate-200 rounded-2xl"></div>
  </div>
)

export default function SalesOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deliveries, setDeliveries] = useState({})

  const { data: order, isLoading } = useQuery({ 
    queryKey: ['sales', id], 
    queryFn: () => api.get(`/sales/${id}`).then(r => r.data) 
  })

  const confirmMut = useMutation({ 
    mutationFn: () => api.post(`/sales/${id}/confirm`), 
    onSuccess: () => { qc.invalidateQueries(['sales', id]); toast.success('Order confirmed successfully') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to confirm order') 
  })
  
  const cancelMut = useMutation({ 
    mutationFn: () => api.post(`/sales/${id}/cancel`), 
    onSuccess: () => { qc.invalidateQueries(['sales', id]); toast.success('Order cancelled') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to cancel order') 
  })
  
  const deliverMut = useMutation({
    mutationFn: () => api.post(`/sales/${id}/deliver`, {
      lines: Object.entries(deliveries).filter(([, qty]) => parseFloat(qty) > 0).map(([line_id, qty]) => ({ line_id, qty: parseFloat(qty) }))
    }),
    onSuccess: () => { qc.invalidateQueries(['sales', id]); setDeliveries({}); toast.success('Delivery recorded successfully') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to record delivery'),
  })

  if (isLoading) return <DetailSkeleton />
  if (!order) return <div className="card text-center py-12 text-slate-500 font-semibold">Sales order details not found.</div>

  const hasRemainingDelivery = order.lines?.some(l => l.qty_remaining > 0)

  return (
    <div className="space-y-6 animate-in">
      <div>
        <button onClick={() => navigate('/sales')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider mb-4">
          <ArrowLeft size={14} /> Back to Sales List
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{order.name}</h1>
            <span className={`${statusBadge(order.status)} capitalize`}>{order.status.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Record ID: <span className="font-mono text-slate-700">{order.id}</span></p>
        </div>
        
        <div className="flex gap-2">
          {order.status === 'draft' && (
            <button className="btn-primary" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
              <CheckCircle size={16} /> Confirm Order
            </button>
          )}
          {['confirmed', 'partially_delivered'].includes(order.status) && hasRemainingDelivery && (
            <button className="btn-success" onClick={() => deliverMut.mutate()} disabled={deliverMut.isPending || Object.values(deliveries).every(v => !v || parseFloat(v) <= 0)}>
              <Truck size={16} /> Record Dispatch
            </button>
          )}
          {['draft', 'confirmed'].includes(order.status) && (
            <button className="btn-danger" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              <XCircle size={16} /> Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <User size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Customer Profile</span>
            <div className="font-bold text-slate-900 text-base">{order.customer?.name}</div>
            {order.customer?.email && <div className="text-xs text-slate-500 mt-0.5">{order.customer.email}</div>}
            {order.customer?.phone && <div className="text-xs text-slate-400 mt-0.5">{order.customer.phone}</div>}
          </div>
        </div>
        
        <div className="card flex items-start gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Order Timestamps</span>
            <div className="text-xs text-slate-700 font-semibold">
              Ordered On: <span className="text-slate-900 font-bold">{new Date(order.order_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
            </div>
            {order.expected_delivery_date && (
              <div className="text-xs text-slate-500 mt-1 font-semibold">
                Expected Delivery: <span className="text-slate-700 font-bold">{new Date(order.expected_delivery_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-bold text-slate-800 text-base">Ordered Items & Delivery Status</h3>
          <span className="text-xs text-slate-400 font-semibold">{order.lines?.length || 0} unique item(s)</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Product Name', 'Ordered', 'Delivered', 'Remaining', 'Unit Price', 'Subtotal'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
                {['confirmed', 'partially_delivered'].includes(order.status) && hasRemainingDelivery && (
                  <th className="th text-right">Deliver Qty</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.lines?.map(line => (
                <tr key={line.id} className="tr-hover">
                  <td className="td font-bold text-slate-900">{line.product?.name}</td>
                  <td className="td font-semibold text-slate-700">{Number(line.qty_ordered).toFixed(0)}</td>
                  <td className="td text-emerald-600 font-bold">{Number(line.qty_delivered).toFixed(0)}</td>
                  <td className="td text-orange-600 font-bold">{Number(line.qty_remaining).toFixed(0)}</td>
                  <td className="td font-medium text-slate-700">₹{Number(line.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="td font-bold text-slate-900">₹{Number(line.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  {['confirmed', 'partially_delivered'].includes(order.status) && hasRemainingDelivery && (
                    <td className="td text-right">
                      {line.qty_remaining > 0 ? (
                        <input
                          className="input w-24 text-right font-bold bg-white"
                          type="number"
                          min="0"
                          max={line.qty_remaining}
                          placeholder="0"
                          value={deliveries[line.id] || ''}
                          onChange={e => setDeliveries(d => ({ ...d, [line.id]: e.target.value }))}
                        />
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md">Fulfilled</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {order.notes && (
        <div className="card bg-slate-50 border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Notes</h4>
          <p className="text-slate-600 text-sm italic">"{order.notes}"</p>
        </div>
      )}
    </div>
  )
}
