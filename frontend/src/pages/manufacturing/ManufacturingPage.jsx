import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Eye, CheckCircle, Play, XCircle, BookOpen } from 'lucide-react'
import api from '../../api/client'

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed', in_progress: 'badge-partial',
  done: 'badge-done', cancelled: 'badge-cancelled',
}[s] || 'badge-draft')

function NewMOForm({ onClose }) {
  const qc = useQueryClient()
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) })
  const { data: boms } = useQuery({ queryKey: ['boms'], queryFn: () => api.get('/manufacturing/boms').then(r => r.data) })
  const [form, setForm] = useState({ product_id: '', bom_id: '', qty_planned: 1, scheduled_date: new Date().toISOString().split('T')[0] })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredBoms = boms?.filter(b => !form.product_id || b.product_id === form.product_id)

  const mut = useMutation({
    mutationFn: d => api.post('/manufacturing/orders', d),
    onSuccess: () => { qc.invalidateQueries(['manufacturing']); onClose(); toast.success('MO created') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">New Manufacturing Order</h3>
        <div className="space-y-3">
          <div><label className="label">Product *</label>
            <select className="input" value={form.product_id} onChange={e => set('product_id', e.target.value)}>
              <option value="">Select product…</option>
              {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="label">Bill of Materials</label>
            <select className="input" value={form.bom_id} onChange={e => set('bom_id', e.target.value)}>
              <option value="">Auto-select active BoM</option>
              {filteredBoms?.map(b => <option key={b.id} value={b.id}>{b.name} v{b.version}</option>)}
            </select>
          </div>
          <div><label className="label">Quantity *</label><input className="input" type="number" value={form.qty_planned} onChange={e => set('qty_planned', e.target.value)} /></div>
          <div><label className="label">Scheduled Date</label><input className="input" type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} /></div>
        </div>
        <div className="flex gap-3 mt-4 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => mut.mutate({ ...form, bom_id: form.bom_id || null, qty_planned: parseFloat(form.qty_planned) })} disabled={mut.isPending}>Create</button>
        </div>
      </div>
    </div>
  )
}

export default function ManufacturingPage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const { data: orders, isLoading } = useQuery({ queryKey: ['manufacturing'], queryFn: () => api.get('/manufacturing/orders').then(r => r.data) })

  const confirmMut = useMutation({ mutationFn: id => api.post(`/manufacturing/orders/${id}/confirm`), onSuccess: () => { qc.invalidateQueries(['manufacturing']); toast.success('Confirmed') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })
  const startMut = useMutation({ mutationFn: id => api.post(`/manufacturing/orders/${id}/start`), onSuccess: () => { qc.invalidateQueries(['manufacturing']); toast.success('Started') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })
  const cancelMut = useMutation({ mutationFn: id => api.post(`/manufacturing/orders/${id}/cancel`), onSuccess: () => { qc.invalidateQueries(['manufacturing']); toast.success('Cancelled') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manufacturing Orders</h2>
        <div className="flex gap-2">
          <Link to="/manufacturing/boms" className="btn-secondary flex items-center gap-2"><BookOpen size={18} /> BoMs</Link>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}><Plus size={18} /> New MO</button>
        </div>
      </div>
      {isLoading ? <div className="text-gray-500">Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>{['MO', 'Product', 'Qty', 'Produced', 'Date', 'Status', 'Origin', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders?.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-600">{o.name}</td>
                  <td className="px-4 py-3 font-medium">{o.product_name}</td>
                  <td className="px-4 py-3">{Number(o.qty_planned).toFixed(0)}</td>
                  <td className="px-4 py-3 text-green-600">{Number(o.qty_produced).toFixed(0)}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{o.scheduled_date || '—'}</td>
                  <td className="px-4 py-3"><span className={statusBadge(o.status)}>{o.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{o.origin_ref || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/manufacturing/${o.id}`} className="p-1 text-blue-600" title="View"><Eye size={16} /></Link>
                      {o.status === 'draft' && <button className="p-1 text-green-600" onClick={() => confirmMut.mutate(o.id)}><CheckCircle size={16} /></button>}
                      {o.status === 'confirmed' && <button className="p-1 text-yellow-600" onClick={() => startMut.mutate(o.id)}><Play size={16} /></button>}
                      {!['done', 'cancelled'].includes(o.status) && <button className="p-1 text-red-500" onClick={() => cancelMut.mutate(o.id)}><XCircle size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!orders?.length && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No manufacturing orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showNew && <NewMOForm onClose={() => setShowNew(false)} />}
    </div>
  )
}
