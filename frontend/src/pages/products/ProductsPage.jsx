import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, TrendingUp } from 'lucide-react'
import api from '../../api/client'

const PROCUREMENT_TYPES = ['purchase', 'manufacturing']
const STRATEGIES = ['mts', 'mto']

function StatusBadge({ active }) {
  return <span className={active ? 'badge-done' : 'badge-cancelled'}>{active ? 'Active' : 'Inactive'}</span>
}

function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', description: '', category: '', unit_of_measure: 'pcs',
    sales_price: '', cost_price: '', on_hand_qty: '0',
    procure_on_demand: false, procurement_type: '', procurement_strategy: 'mts',
    reorder_point: '0', reorder_qty: '0', vendor_id: '',
  })

  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/vendors').then(r => r.data) })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-bold mb-4">{initial ? 'Edit Product' : 'New Product'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Name *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
          <div><label className="label">Category</label><input className="input" value={form.category} onChange={e => set('category', e.target.value)} /></div>
          <div><label className="label">Unit</label><input className="input" value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)} /></div>
          <div><label className="label">Sales Price *</label><input className="input" type="number" value={form.sales_price} onChange={e => set('sales_price', e.target.value)} /></div>
          <div><label className="label">Cost Price *</label><input className="input" type="number" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} /></div>
          {!initial && <div><label className="label">Initial Stock</label><input className="input" type="number" value={form.on_hand_qty} onChange={e => set('on_hand_qty', e.target.value)} /></div>}
          <div><label className="label">Procurement Strategy</label>
            <select className="input" value={form.procurement_strategy} onChange={e => set('procurement_strategy', e.target.value)}>
              {STRATEGIES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" id="pod" checked={form.procure_on_demand} onChange={e => set('procure_on_demand', e.target.checked)} />
            <label htmlFor="pod" className="text-sm font-medium text-gray-700">Enable Auto Procurement</label>
          </div>
          {form.procure_on_demand && <>
            <div><label className="label">Procurement Type</label>
              <select className="input" value={form.procurement_type} onChange={e => set('procurement_type', e.target.value)}>
                <option value="">Select…</option>
                {PROCUREMENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div><label className="label">Default Vendor</label>
              <select className="input" value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}>
                <option value="">None</option>
                {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div><label className="label">Reorder Point</label><input className="input" type="number" value={form.reorder_point} onChange={e => set('reorder_point', e.target.value)} /></div>
            <div><label className="label">Reorder Qty</label><input className="input" type="number" value={form.reorder_qty} onChange={e => set('reorder_qty', e.target.value)} /></div>
          </>}
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then(r => r.data),
  })

  const createMut = useMutation({
    mutationFn: (data) => api.post('/products', data),
    onSuccess: () => { qc.invalidateQueries(['products']); setShowForm(false); toast.success('Product created') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['products']); setEditing(null); toast.success('Product updated') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const adjustMut = useMutation({
    mutationFn: ({ id, qty }) => api.post(`/products/${id}/adjust-stock`, { qty: parseFloat(qty) }),
    onSuccess: () => { qc.invalidateQueries(['products']); setAdjusting(null); setAdjustQty(''); toast.success('Stock adjusted') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const handleSave = (form) => {
    const data = { ...form, vendor_id: form.vendor_id || null, procurement_type: form.procurement_type || null }
    if (editing) updateMut.mutate({ id: editing.id, data })
    else createMut.mutate(data)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Products</h2>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus size={18} /> New Product
        </button>
      </div>

      {isLoading ? <div className="text-gray-500">Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Category', 'Sales Price', 'Cost', 'On Hand', 'Reserved', 'Free to Use', 'Strategy', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products?.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">₹{Number(p.sales_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-700">₹{Number(p.cost_price).toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{Number(p.on_hand_qty).toFixed(0)} {p.unit_of_measure}</td>
                  <td className="px-4 py-3 text-orange-600">{Number(p.reserved_qty).toFixed(0)}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{Number(p.free_to_use_qty).toFixed(0)}</td>
                  <td className="px-4 py-3"><span className="badge-confirmed">{p.procurement_strategy?.toUpperCase()}</span></td>
                  <td className="px-4 py-3"><StatusBadge active={p.is_active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-blue-600 hover:text-blue-700" onClick={() => setEditing(p)} title="Edit"><Edit2 size={16} /></button>
                      <button className="p-1 text-green-600 hover:text-green-700" onClick={() => setAdjusting(p)} title="Adjust Stock"><TrendingUp size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products?.length && <tr><td colSpan={10} className="text-center py-8 text-gray-400">No products yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {(showForm || editing) && (
        <ProductForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {adjusting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Adjust Stock – {adjusting.name}</h3>
            <p className="text-sm text-gray-500 mb-3">Current: {Number(adjusting.on_hand_qty).toFixed(0)} {adjusting.unit_of_measure}</p>
            <label className="label">Qty Change (+ or -)</label>
            <input className="input" type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="e.g. 50 or -10" />
            <div className="flex gap-3 mt-4 justify-end">
              <button className="btn-secondary" onClick={() => { setAdjusting(null); setAdjustQty('') }}>Cancel</button>
              <button className="btn-primary" onClick={() => adjustMut.mutate({ id: adjusting.id, qty: adjustQty })}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
