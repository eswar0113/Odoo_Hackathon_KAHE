import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Eye, CheckCircle, XCircle } from 'lucide-react'
import api from '../../api/client'

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
    onSuccess: () => { qc.invalidateQueries(['purchase']); onClose(); toast.success('Purchase order created') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  const handleSave = () => {
    mut.mutate({ ...form, lines: lines.map(l => ({ ...l, qty_ordered: parseFloat(l.qty_ordered), unit_price: parseFloat(l.unit_price) })) })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-bold mb-4">New Purchase Order</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2"><label className="label">Vendor *</label>
            <select className="input" value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}>
              <option value="">Select vendor…</option>
              {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div><label className="label">Order Date</label><input className="input" type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} /></div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Order Lines</label>
            <button className="text-sm text-blue-600 hover:underline" onClick={addLine}>+ Add Line</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
              <div className="col-span-5">
                <select className="input text-sm" value={line.product_id} onChange={e => pickProduct(i, e.target.value)}>
                  <option value="">Product…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-3"><input className="input text-sm" type="number" placeholder="Qty" value={line.qty_ordered} onChange={e => setLine(i, 'qty_ordered', e.target.value)} /></div>
              <div className="col-span-3"><input className="input text-sm" type="number" placeholder="Cost" value={line.unit_price} onChange={e => setLine(i, 'unit_price', e.target.value)} /></div>
              <div className="col-span-1"><button className="text-red-500 text-lg" onClick={() => removeLine(i)}>×</button></div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={mut.isPending}>Create</button>
        </div>
      </div>
    </div>
  )
}

export default function PurchasePage() {
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)
  const { data: orders, isLoading } = useQuery({ queryKey: ['purchase'], queryFn: () => api.get('/purchase').then(r => r.data) })

  const confirmMut = useMutation({ mutationFn: id => api.post(`/purchase/${id}/confirm`), onSuccess: () => { qc.invalidateQueries(['purchase']); toast.success('Order confirmed') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })
  const cancelMut = useMutation({ mutationFn: id => api.post(`/purchase/${id}/cancel`), onSuccess: () => { qc.invalidateQueries(['purchase']); toast.success('Order cancelled') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}><Plus size={18} /> New Purchase Order</button>
      </div>
      {isLoading ? <div className="text-gray-500">Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>{['Order', 'Vendor', 'Date', 'Status', 'Lines', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders?.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-purple-600">{o.name}</td>
                  <td className="px-4 py-3">{o.vendor?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{o.order_date}</td>
                  <td className="px-4 py-3"><span className={statusBadge(o.status)}>{o.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-4 py-3 text-gray-500">{o.lines?.length} line(s)</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/purchase/${o.id}`} className="p-1 text-blue-600 hover:text-blue-700" title="View"><Eye size={16} /></Link>
                      {o.status === 'draft' && <button className="p-1 text-green-600" onClick={() => confirmMut.mutate(o.id)}><CheckCircle size={16} /></button>}
                      {['draft', 'confirmed'].includes(o.status) && <button className="p-1 text-red-500" onClick={() => cancelMut.mutate(o.id)}><XCircle size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!orders?.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No purchase orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showNew && <NewPOForm onClose={() => setShowNew(false)} />}
    </div>
  )
}
