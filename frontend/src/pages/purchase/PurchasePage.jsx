import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Eye, CheckCircle, XCircle, X, Trash2, Truck, ShoppingBag, Calendar, Filter } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Pagination, { PAGE_SIZE } from '../../components/Pagination'

const fmt = n => '₹' + Math.round(n || 0).toLocaleString('en-IN')
const poTotal = o => o.lines?.reduce((s, l) => s + parseFloat(l.qty_ordered || 0) * parseFloat(l.unit_price || 0), 0) || 0
const initials = name => name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const isOverdue = o => ['confirmed', 'partially_received'].includes(o.status) && o.expected_date && new Date(o.expected_date) < new Date()

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed',
  partially_received: 'badge-partial', fully_received: 'badge-done', cancelled: 'badge-cancelled',
}[s] || 'badge-draft')

function NewPOForm({ onClose }) {
  const qc = useQueryClient()
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/vendors').then(r => r.data) })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) })
  const [form, setForm] = useState({ vendor_id: '', order_date: new Date().toISOString().split('T')[0], notes: '' })
  const [lines, setLines] = useState([{ product_id: '', qty_ordered: 1, unit_price: '' }])

  const addLine = () => setLines(l => [...l, { product_id: '', qty_ordered: 1, unit_price: '' }])
  const setLine = (i, k, v) => setLines(l => l.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i))
  const pickProduct = (i, pid) => {
    const p = products?.find(x => x.id === pid)
    setLine(i, 'product_id', pid)
    if (p) setLine(i, 'unit_price', p.cost_price)
  }

  const mut = useMutation({
    mutationFn: d => api.post('/purchase', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase'] }); onClose(); toast.success('Purchase order created successfully') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create purchase order'),
  })

  const handleSave = () => {
    if (!form.vendor_id) return toast.error('Please select a vendor')
    if (lines.some(l => !l.product_id || !l.qty_ordered || !l.unit_price)) {
      return toast.error('Please complete all order lines')
    }
    mut.mutate({ 
      ...form, 
      lines: lines.map(l => ({ 
        ...l, 
        qty_ordered: parseFloat(l.qty_ordered), 
        unit_price: parseFloat(l.unit_price) 
      })) 
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl animate-in">
        <div className="modal-header">
          <h3 className="text-lg font-bold text-slate-900">New Purchase Order</h3>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Vendor *</label>
              <select className="input" value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}>
                <option value="">Select vendor…</option>
                {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="label">Order Date</label>
              <input className="input" type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} />
            </div>
            
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="e.g. Rush delivery requested" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0 font-semibold text-slate-800 text-sm">Order Lines</label>
              <button className="btn-secondary py-1.5 px-3 text-xs" onClick={addLine}>
                <Plus size={14} /> Add Line
              </button>
            </div>
            
            <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 animate-in">
                  <div className="col-span-5">
                    <select className="input text-sm bg-white" value={line.product_id} onChange={e => pickProduct(i, e.target.value)}>
                      <option value="">Product…</option>
                      {products?.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input className="input text-sm bg-white" type="number" min="1" placeholder="Qty" value={line.qty_ordered} onChange={e => setLine(i, 'qty_ordered', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input className="input text-sm bg-white" type="number" min="0.01" step="0.01" placeholder="Cost (₹)" value={line.unit_price} onChange={e => setLine(i, 'unit_price', e.target.value)} />
                  </div>
                  <div className="col-span-1 text-center">
                    <button className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end sticky bottom-0 bg-white">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={mut.isPending}>
            {mut.isPending ? 'Creating...' : 'Create Purchase Order'}
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
          <div className="h-4 bg-slate-200 rounded w-1/5"></div>
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/8"></div>
          <div className="h-4 bg-slate-200 rounded w-1/8"></div>
          <div className="h-4 bg-slate-200 rounded w-1/10"></div>
        </div>
      ))}
    </div>
  </div>
)

const EmptyState = ({ onAction, canCreate }) => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
      <Truck size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No purchase orders found</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Create a purchase order to coordinate materials procurement from vendors and receive incoming inventory.
    </p>
    {canCreate && (
      <button className="btn-primary" onClick={onAction}>
        <Plus size={16} /> Create First Purchase Order
      </button>
    )}
  </div>
)

export default function PurchasePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const canCreate = ['admin', 'owner', 'purchase'].includes(user?.role)
  const canCancel = ['admin', 'owner'].includes(user?.role)
  const [showNew, setShowNew] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: '', date_from: '', date_to: '' })
  const hasFilters = filters.status || filters.date_from || filters.date_to
  useEffect(() => { setPage(1) }, [filters])

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase', filters, page],
    queryFn: () => {
      const params = { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (filters.status) params.status = filters.status
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      return api.get('/purchase', { params }).then(r => r.data)
    },
  })

  const confirmMut = useMutation({ 
    mutationFn: id => api.post(`/purchase/${id}/confirm`), 
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase'] }); toast.success('Purchase order confirmed') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to confirm order') 
  })
  
  const cancelMut = useMutation({ 
    mutationFn: id => api.post(`/purchase/${id}/cancel`), 
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase'] }); toast.success('Purchase order cancelled') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to cancel order') 
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <div className="page-icon bg-blue-50 text-blue-800">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Purchase Orders</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track material requisitions, reception progress, and vendor costs.</p>
          </div>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={18} /> New Purchase Order
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Filter size={14} className="text-slate-400 flex-shrink-0" />
        <select className="input py-2 text-sm w-52" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="partially_received">Partially Received</option>
          <option value="fully_received">Fully Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex items-center gap-2 ml-1">
          <Calendar size={13} className="text-slate-400" />
          <input type="date" className="input py-2 text-sm w-36" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} title="From date" />
          <span className="text-slate-400 text-xs font-medium">to</span>
          <input type="date" className="input py-2 text-sm w-36" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} title="To date" />
        </div>
        {hasFilters && (
          <button className="btn-secondary py-1.5 px-3 text-xs ml-auto" onClick={() => setFilters({ status: '', date_from: '', date_to: '' })}>
            <X size={12} /> Clear
          </button>
        )}
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
                <tr className="border-b-2 border-slate-100">
                  <th className="th">Order</th>
                  <th className="th">Vendor</th>
                  <th className="th">Status</th>
                  <th className="th">Expected</th>
                  <th className="th">Lines</th>
                  <th className="th-amount">Amount</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => {
                  const total = poTotal(o)
                  const overdue = isOverdue(o)
                  return (
                    <tr key={o.id} className={`tr-hover cursor-pointer ${overdue ? 'bg-rose-50/30' : ''}`} onClick={() => navigate(`/purchase/${o.id}`)}>
                      <td className="td">
                        <div className="font-mono font-bold text-violet-600 text-sm">{o.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{fmtDate(o.order_date)}</div>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <div className="avatar bg-indigo-50 text-indigo-700">{initials(o.vendor?.name)}</div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm leading-tight">{o.vendor?.name || '—'}</div>
                            {o.vendor?.email && <div className="text-xs text-slate-400 truncate max-w-[140px]">{o.vendor.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <span className={`${statusBadge(o.status)} capitalize`}>{o.status.replace(/_/g, ' ')}</span>
                        {overdue && <div className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-wide">Overdue</div>}
                      </td>
                      <td className="td">
                        {o.expected_date ? (
                          <div className={`text-sm font-medium ${overdue ? 'text-rose-600' : 'text-slate-600'}`}>
                            {fmtDate(o.expected_date)}
                          </div>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="td">
                        <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                          {o.lines?.length || 0} item{o.lines?.length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="td-amount">{fmt(total)}</td>
                      <td className="td" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Link to={`/purchase/${o.id}`} className="btn-icon text-indigo-600 hover:bg-indigo-50" title="View Details">
                            <Eye size={16} />
                          </Link>
                          {canCreate && o.status === 'draft' && (
                            <button className="btn-icon text-emerald-600 hover:bg-emerald-50" title="Confirm Order" onClick={() => confirmMut.mutate(o.id)}>
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {canCancel && ['draft', 'confirmed'].includes(o.status) && (
                            <button className="btn-icon text-rose-600 hover:bg-rose-50" title="Cancel Order" onClick={() => cancelMut.mutate(o.id)}>
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={orders?.length ?? 0} onPageChange={setPage} />
        </div>
      )}

      {showNew && <NewPOForm onClose={() => setShowNew(false)} />}
    </div>
  )
}
