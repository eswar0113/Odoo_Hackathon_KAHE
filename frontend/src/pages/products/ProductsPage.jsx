import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, TrendingUp, X, Package } from 'lucide-react'
import api from '../../api/client'

const PROCUREMENT_TYPES = ['purchase', 'manufacturing']
const STRATEGIES = ['mts', 'mto']

function StatusBadge({ active }) {
  return (
    <span className={active ? 'badge-done' : 'badge-cancelled'}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
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
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl animate-in">
        <div className="modal-header">
          <h3 className="text-lg font-bold text-slate-900">{initial ? 'Edit Product' : 'New Product'}</h3>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name *</label>
              <input className="input" placeholder="e.g. Solid Oak Table" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} placeholder="Brief product summary..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            
            <div>
              <label className="label">Category</label>
              <input className="input" placeholder="e.g. Furniture" value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
            
            <div>
              <label className="label">Unit of Measure</label>
              <input className="input" placeholder="e.g. pcs, kg" value={form.unit_of_measure} onChange={e => set('unit_of_measure', e.target.value)} />
            </div>
            
            <div>
              <label className="label">Sales Price (₹) *</label>
              <input className="input" type="number" placeholder="0.00" value={form.sales_price} onChange={e => set('sales_price', e.target.value)} />
            </div>
            
            <div>
              <label className="label">Cost Price (₹) *</label>
              <input className="input" type="number" placeholder="0.00" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} />
            </div>
            
            {!initial && (
              <div>
                <label className="label">Initial Stock Level</label>
                <input className="input" type="number" placeholder="0" value={form.on_hand_qty} onChange={e => set('on_hand_qty', e.target.value)} />
              </div>
            )}
            
            <div>
              <label className="label">Procurement Strategy</label>
              <select className="input" value={form.procurement_strategy} onChange={e => set('procurement_strategy', e.target.value)}>
                {STRATEGIES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>

            <div className="col-span-2 py-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4.5 h-4.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500" 
                  id="pod" 
                  checked={form.procure_on_demand} 
                  onChange={e => set('procure_on_demand', e.target.checked)} 
                />
                <span className="text-sm font-semibold text-slate-700">Enable Auto Procurement</span>
              </label>
            </div>
            
            {form.procure_on_demand && (
              <div className="col-span-2 grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 animate-in">
                <div>
                  <label className="label text-indigo-700">Procurement Type</label>
                  <select className="input bg-white" value={form.procurement_type} onChange={e => set('procurement_type', e.target.value)}>
                    <option value="">Select…</option>
                    {PROCUREMENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="label text-indigo-700">Default Vendor</label>
                  <select className="input bg-white" value={form.vendor_id} onChange={e => set('vendor_id', e.target.value)}>
                    <option value="">None</option>
                    {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="label text-indigo-700">Reorder Point (Min)</label>
                  <input className="input bg-white" type="number" placeholder="0" value={form.reorder_point} onChange={e => set('reorder_point', e.target.value)} />
                </div>
                
                <div>
                  <label className="label text-indigo-700">Reorder Qty</label>
                  <input className="input bg-white" type="number" placeholder="0" value={form.reorder_qty} onChange={e => set('reorder_qty', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end sticky bottom-0 bg-white">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Save Product</button>
        </div>
      </div>
    </div>
  )
}

const TableSkeleton = () => (
  <div className="table-wrapper animate-pulse">
    <div className="h-12 bg-slate-50 border-b border-slate-100"></div>
    <div className="divide-y divide-slate-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex px-5 py-4 gap-4 items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/12"></div>
          <div className="h-4 bg-slate-200 rounded w-1/12"></div>
          <div className="h-4 bg-slate-200 rounded w-1/12"></div>
          <div className="h-4 bg-slate-200 rounded w-1/12"></div>
        </div>
      ))}
    </div>
  </div>
)

const EmptyState = ({ onAction }) => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
      <Package size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No products registered</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Add products to your catalog to start managing inventory levels, processing sales orders, and tracking manufacturing processes.
    </p>
    <button className="btn-primary" onClick={onAction}>
      <Plus size={16} /> Create First Product
    </button>
  </div>
)

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
    onSuccess: () => { qc.invalidateQueries(['products']); setShowForm(false); toast.success('Product created successfully') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create product'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['products']); setEditing(null); toast.success('Product updated successfully') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to update product'),
  })

  const adjustMut = useMutation({
    mutationFn: ({ id, qty }) => api.post(`/products/${id}/adjust-stock`, { qty: parseFloat(qty) }),
    onSuccess: () => { qc.invalidateQueries(['products']); setAdjusting(null); setAdjustQty(''); toast.success('Stock level adjusted') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to adjust stock'),
  })

  const handleSave = (form) => {
    const data = { ...form, vendor_id: form.vendor_id || null, procurement_type: form.procurement_type || null }
    if (editing) updateMut.mutate({ id: editing.id, data })
    else createMut.mutate(data)
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Products</h1>
          <p className="text-slate-500 text-sm mt-1">Manage items, stock counts, auto procurement rules, and sales parameters.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> New Product
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : !products?.length ? (
        <EmptyState onAction={() => setShowForm(true)} />
      ) : (
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Name', 'Category', 'Sales Price', 'Cost Price', 'On Hand', 'Reserved', 'Free to Use', 'Strategy', 'Status', 'Actions'].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.id} className="tr-hover">
                    <td className="td font-semibold text-slate-900">{p.name}</td>
                    <td className="td text-slate-500 text-xs font-medium">{p.category || '—'}</td>
                    <td className="td font-medium text-slate-900">₹{Number(p.sales_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="td text-slate-600">₹{Number(p.cost_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="td font-bold text-slate-800">{Number(p.on_hand_qty).toFixed(0)} <span className="text-slate-400 font-medium text-xs">{p.unit_of_measure}</span></td>
                    <td className="td text-amber-600 font-semibold">{Number(p.reserved_qty).toFixed(0)}</td>
                    <td className="td text-emerald-600 font-bold">{Number(p.free_to_use_qty).toFixed(0)}</td>
                    <td className="td">
                      <span className="badge-progress uppercase">{p.procurement_strategy}</span>
                    </td>
                    <td className="td">
                      <StatusBadge active={p.is_active} />
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-1">
                        <button className="btn-icon text-indigo-600 hover:bg-indigo-50" onClick={() => setEditing(p)} title="Edit Product">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon text-emerald-600 hover:bg-emerald-50" onClick={() => setAdjusting(p)} title="Adjust Stock">
                          <TrendingUp size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <div className="modal-overlay">
          <div className="modal-box max-w-md animate-in">
            <div className="modal-header">
              <h3 className="text-lg font-bold text-slate-900">Adjust Stock Level</h3>
              <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={() => { setAdjusting(null); setAdjustQty('') }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold block">Product</span>
                  <span className="text-sm font-bold text-slate-800">{adjusting.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase font-semibold block">Current Stock</span>
                  <span className="text-sm font-bold text-slate-800">{Number(adjusting.on_hand_qty).toFixed(0)} {adjusting.unit_of_measure}</span>
                </div>
              </div>
              
              <div>
                <label className="label">Quantity Adjustment (+ or -)</label>
                <input className="input" type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="e.g. +50 or -10" />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">Enter a positive number to add stock, or a negative number to subtract stock from current inventory.</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-white">
              <button className="btn-secondary" onClick={() => { setAdjusting(null); setAdjustQty('') }}>Cancel</button>
              <button className="btn-primary" onClick={() => adjustMut.mutate({ id: adjusting.id, qty: adjustQty })}>Apply Adjustment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
