import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, PackageCheck, XCircle, Calendar, Building2, Clipboard } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed',
  partially_received: 'badge-partial', fully_received: 'badge-done', cancelled: 'badge-cancelled',
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

export default function PurchaseOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const canCreate = ['admin', 'owner', 'purchase'].includes(user?.role)
  const canCancel  = ['admin', 'owner'].includes(user?.role)
  const [receipts, setReceipts] = useState({})

  const { data: order, isLoading } = useQuery({ 
    queryKey: ['purchase', id], 
    queryFn: () => api.get(`/purchase/${id}`).then(r => r.data) 
  })

  const confirmMut = useMutation({ 
    mutationFn: () => api.post(`/purchase/${id}/confirm`), 
    onSuccess: () => { qc.invalidateQueries(['purchase', id]); toast.success('Purchase order confirmed') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to confirm order') 
  })
  
  const cancelMut = useMutation({ 
    mutationFn: () => api.post(`/purchase/${id}/cancel`), 
    onSuccess: () => { qc.invalidateQueries(['purchase', id]); toast.success('Purchase order cancelled') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to cancel order') 
  })
  
  const receiveMut = useMutation({
    mutationFn: () => api.post(`/purchase/${id}/receive`, {
      lines: Object.entries(receipts).filter(([, qty]) => parseFloat(qty) > 0).map(([line_id, qty]) => ({ line_id, qty: parseFloat(qty) }))
    }),
    onSuccess: () => { qc.invalidateQueries(['purchase', id]); setReceipts({}); toast.success('Items received successfully') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to receive items'),
  })

  if (isLoading) return <DetailSkeleton />
  if (!order) return <div className="card text-center py-12 text-slate-500 font-semibold">Purchase order details not found.</div>

  const hasRemainingReceipts = order.lines?.some(l => l.qty_remaining > 0)

  return (
    <div className="space-y-6 animate-in">
      <div>
        <button onClick={() => navigate('/purchase')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider mb-4">
          <ArrowLeft size={14} /> Back to Purchase List
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{order.name}</h1>
            <span className={`${statusBadge(order.status)} capitalize`}>{order.status.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 font-medium text-xs text-slate-500">
            <span>Record ID: <span className="font-mono text-slate-700">{order.id}</span></span>
            {order.origin_ref && (
              <span className="flex items-center gap-1">
                <Clipboard size={12} className="text-slate-400" />
                Origin: <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{order.origin_ref}</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {canCreate && order.status === 'draft' && (
            <button className="btn-primary" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
              <CheckCircle size={16} /> Confirm Order
            </button>
          )}
          {canCreate && ['confirmed', 'partially_received'].includes(order.status) && hasRemainingReceipts && (
            <button className="btn-success" onClick={() => receiveMut.mutate()} disabled={receiveMut.isPending || Object.values(receipts).every(v => !v || parseFloat(v) <= 0)}>
              <PackageCheck size={16} /> Receive Inventory
            </button>
          )}
          {canCancel && ['draft', 'confirmed'].includes(order.status) && (
            <button className="btn-danger" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              <XCircle size={16} /> Cancel Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Vendor Partner</span>
            <div className="font-bold text-slate-900 text-base">{order.vendor?.name}</div>
            {order.vendor?.email && <div className="text-xs text-slate-500 mt-0.5">{order.vendor.email}</div>}
            {order.vendor?.phone && <div className="text-xs text-slate-400 mt-0.5">{order.vendor.phone}</div>}
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
            {order.expected_date && (
              <div className="text-xs text-slate-500 mt-1 font-semibold">
                Expected Reception: <span className="text-slate-700 font-bold">{new Date(order.expected_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <h3 className="font-bold text-slate-800 text-base">Requisition Items & Reception Status</h3>
          <span className="text-xs text-slate-400 font-semibold">{order.lines?.length || 0} unique item(s)</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Product Name', 'Ordered', 'Received', 'Remaining', 'Cost Price', 'Subtotal'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
                {['confirmed', 'partially_received'].includes(order.status) && hasRemainingReceipts && (
                  <th className="th text-right">Receive Qty</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.lines?.map(line => (
                <tr key={line.id} className="tr-hover">
                  <td className="td font-bold text-slate-900">{line.product?.name}</td>
                  <td className="td font-semibold text-slate-700">{Number(line.qty_ordered).toFixed(0)}</td>
                  <td className="td text-emerald-600 font-bold">{Number(line.qty_received).toFixed(0)}</td>
                  <td className="td text-orange-600 font-bold">{Number(line.qty_remaining).toFixed(0)}</td>
                  <td className="td font-medium text-slate-700">₹{Number(line.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="td font-bold text-slate-900">₹{Number(line.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  {['confirmed', 'partially_received'].includes(order.status) && hasRemainingReceipts && (
                    <td className="td text-right">
                      {line.qty_remaining > 0 ? (
                        <input
                          className="input w-24 text-right font-bold bg-white"
                          type="number"
                          min="0"
                          max={line.qty_remaining}
                          placeholder="0"
                          value={receipts[line.id] || ''}
                          onChange={e => setReceipts(d => ({ ...d, [line.id]: e.target.value }))}
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
