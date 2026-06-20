import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Eye, CheckCircle, Play, XCircle, BookOpen, X, Factory } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed', in_progress: 'badge-progress',
  done: 'badge-done', cancelled: 'badge-cancelled',
}[s] || 'badge-draft')

function NewMOForm({ onClose }) {
  const qc = useQueryClient()
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) })
  const { data: boms } = useQuery({ queryKey: ['boms'], queryFn: () => api.get('/manufacturing/boms').then(r => r.data) })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/auth/users').then(r => r.data) })
  const [form, setForm] = useState({ product_id: '', bom_id: '', qty_planned: 1, scheduled_date: new Date().toISOString().split('T')[0], assignee_id: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredBoms = boms?.filter(b => !form.product_id || b.product_id === form.product_id)

  const mut = useMutation({
    mutationFn: d => api.post('/manufacturing/orders', d),
    onSuccess: () => { qc.invalidateQueries(['manufacturing']); onClose(); toast.success('Manufacturing order created') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create MO'),
  })

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md animate-in">
        <div className="modal-header">
          <h3 className="text-lg font-bold text-slate-900">New Manufacturing Order</h3>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Product *</label>
            <select className="input" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
              <option value="">Select product…</option>
              {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="label">Bill of Materials</label>
            <select className="input" value={form.bom_id} onChange={e => set('bom_id', e.target.value)}>
              <option value="">Auto-select active BoM</option>
              {filteredBoms?.map(b => <option key={b.id} value={b.id}>{b.name} v{b.version}</option>)}
            </select>
          </div>
          
          <div>
            <label className="label">Planned Quantity *</label>
            <input className="input" type="number" min="1" value={form.qty_planned} onChange={e => set('qty_planned', e.target.value)} />
          </div>
          
          <div>
            <label className="label">Scheduled Date</label>
            <input className="input" type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
          </div>

          <div>
            <label className="label">Assignee</label>
            <select className="input" value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}>
              <option value="">Unassigned</option>
              {users?.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-white">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mut.mutate({ ...form, bom_id: form.bom_id || null, qty_planned: parseFloat(form.qty_planned), assignee_id: form.assignee_id || null })} disabled={mut.isPending}>
            {mut.isPending ? 'Creating...' : 'Create MO'}
          </button>
        </div>
      </div>
    </div>
  )
}

const TableSkeleton = () => (
  <div className="table-wrapper animate-pulse">
    <div className="h-12 bg-slate-50 border-b border-slate-100"></div>
    <div className="divide-y divide-slate-100">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex px-5 py-4 gap-4 items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/12"></div>
          <div className="h-4 bg-slate-200 rounded w-1/12"></div>
          <div className="h-4 bg-slate-200 rounded w-1/8"></div>
          <div className="h-4 bg-slate-200 rounded w-1/8"></div>
        </div>
      ))}
    </div>
  </div>
)

const EmptyState = ({ onAction, canCreate }) => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
      <Factory size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No manufacturing orders</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Plan, schedule, and track product assembly operations, material consumption, and floor execution statuses.
    </p>
    {canCreate && (
      <button className="btn-primary" onClick={onAction}>
        <Plus size={16} /> Plan First MO
      </button>
    )}
  </div>
)

export default function ManufacturingPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canCreate = ['admin', 'owner', 'manufacturing'].includes(user?.role)
  const canCancel = ['admin', 'owner'].includes(user?.role)
  const [showNew, setShowNew] = useState(false)
  const { data: orders, isLoading } = useQuery({ queryKey: ['manufacturing'], queryFn: () => api.get('/manufacturing/orders').then(r => r.data) })

  const confirmMut = useMutation({ 
    mutationFn: id => api.post(`/manufacturing/orders/${id}/confirm`), 
    onSuccess: () => { qc.invalidateQueries(['manufacturing']); toast.success('MO confirmed successfully') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to confirm order') 
  })
  
  const startMut = useMutation({ 
    mutationFn: id => api.post(`/manufacturing/orders/${id}/start`), 
    onSuccess: () => { qc.invalidateQueries(['manufacturing']); toast.success('MO execution started') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to start execution') 
  })
  
  const cancelMut = useMutation({ 
    mutationFn: id => api.post(`/manufacturing/orders/${id}/cancel`), 
    onSuccess: () => { qc.invalidateQueries(['manufacturing']); toast.success('MO cancelled') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to cancel order') 
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Manufacturing Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Schedule production orders, track raw material reserves, and confirm outputs.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/manufacturing/boms" className="btn-secondary">
            <BookOpen size={16} /> Bill of Materials
          </Link>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              <Plus size={18} /> New MO
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : !orders?.length ? (
        <EmptyState onAction={() => setShowNew(true)} canCreate={canCreate} />
      ) : (
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['MO Code', 'Product', 'Planned Qty', 'Produced Qty', 'Scheduled Date', 'Status', 'Origin', 'Actions'].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => (
                  <tr key={o.id} className="tr-hover">
                    <td className="td font-mono font-bold text-indigo-600">{o.name}</td>
                    <td className="td font-semibold text-slate-800">{o.product_name}</td>
                    <td className="td text-slate-700 font-medium">{Number(o.qty_planned).toFixed(0)}</td>
                    <td className="td text-emerald-600 font-bold">{Number(o.qty_produced).toFixed(0)}</td>
                    <td className="td text-slate-500 text-sm font-medium">
                      {o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="td">
                      <span className={`${statusBadge(o.status)} capitalize`}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="td font-mono text-slate-400 text-xs">{o.origin_ref || '—'}</td>
                    <td className="td">
                      <div className="flex items-center gap-1">
                        <Link to={`/manufacturing/${o.id}`} className="btn-icon text-indigo-600 hover:bg-indigo-50" title="View MO Details">
                          <Eye size={16} />
                        </Link>
                        {canCreate && o.status === 'draft' && (
                          <button className="btn-icon text-emerald-600 hover:bg-emerald-50" title="Confirm MO" onClick={() => confirmMut.mutate(o.id)}>
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {canCreate && o.status === 'confirmed' && (
                          <button className="btn-icon text-amber-600 hover:bg-amber-50" title="Start Production" onClick={() => startMut.mutate(o.id)}>
                            <Play size={16} />
                          </button>
                        )}
                        {canCancel && !['done', 'cancelled'].includes(o.status) && (
                          <button className="btn-icon text-rose-600 hover:bg-rose-50" title="Cancel MO" onClick={() => cancelMut.mutate(o.id)}>
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && <NewMOForm onClose={() => setShowNew(false)} />}
    </div>
  )
}
