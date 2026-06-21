import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, TrendingUp, X, Package, Search, FlaskConical, RefreshCw, IndianRupee } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Pagination, { PAGE_SIZE } from '../../components/Pagination'

const fmtPrice = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const inclTax = (price, tax) => parseFloat(price || 0) * (1 + parseFloat(tax || 0) / 100)

const PROCUREMENT_TYPES = ['purchase', 'manufacturing']
const STRATEGIES = ['mts', 'mto']

function StatusBadge({ active }) {
  return (
    <span className={active ? 'badge-done' : 'badge-cancelled'}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function PricingModal({ product, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    cost_price: product.cost_price,
    sales_price: product.sales_price,
    tax_percent: product.tax_percent || 0,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const basePrice = parseFloat(form.sales_price || 0)
  const taxAmt = basePrice * parseFloat(form.tax_percent || 0) / 100
  const totalPrice = basePrice + taxAmt
  const margin = basePrice > 0
    ? ((basePrice - parseFloat(form.cost_price || 0)) / basePrice * 100).toFixed(1)
    : 0

  const pricingMut = useMutation({
    mutationFn: () => api.patch(`/products/${product.id}/pricing`, {
      cost_price: parseFloat(form.cost_price),
      sales_price: parseFloat(form.sales_price),
      tax_percent: parseFloat(form.tax_percent),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Prices updated'); onClose() },
    onError: e => toast.error(e.response?.data?.detail || 'Update failed'),
  })

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm animate-scale-in">
        <div className="modal-header">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee size={16} className="text-indigo-500" /> Pricing
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{product.name}</p>
          </div>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cost Price (₹)</label>
              <input className="input" type="number" min="0" step="0.01"
                value={form.cost_price} onChange={e => set('cost_price', e.target.value)} />
            </div>
            <div>
              <label className="label">Sale Price (₹)</label>
              <input className="input" type="number" min="0" step="0.01"
                value={form.sales_price} onChange={e => set('sales_price', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Tax / GST (%)</label>
            <div className="relative">
              <input className="input pr-8" type="number" min="0" max="100" step="0.5"
                value={form.tax_percent} onChange={e => set('tax_percent', e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">%</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[0, 5, 12, 18, 28].map(t => (
                <button key={t} onClick={() => set('tax_percent', t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    parseFloat(form.tax_percent) === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {t}%
                </button>
              ))}
            </div>
          </div>

          {/* Live preview card */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-4 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Base price</span>
              <span className="font-semibold text-slate-800">{fmtPrice(basePrice)}</span>
            </div>
            {parseFloat(form.tax_percent) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">GST ({form.tax_percent}%)</span>
                <span className="font-semibold text-amber-600">+ {fmtPrice(taxAmt)}</span>
              </div>
            )}
            <div className="border-t border-indigo-200 pt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Price incl. tax</span>
              <span className="text-xl font-extrabold text-indigo-700 tabular-nums">{fmtPrice(totalPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Gross margin</span>
              <span className={`font-bold ${margin >= 30 ? 'text-emerald-600' : margin >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                {margin}%
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 justify-end bg-white">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => pricingMut.mutate()} disabled={pricingMut.isPending}>
            <IndianRupee size={14} />
            {pricingMut.isPending ? 'Saving…' : 'Update Prices'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '', description: '', category: '', unit_of_measure: 'pcs',
    sales_price: '', cost_price: '', tax_percent: '0', on_hand_qty: '0',
    procure_on_demand: false, procurement_type: '', procurement_strategy: 'mts',
    reorder_point: '0', reorder_qty: '0', vendor_id: '',
  })

  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/vendors').then(r => r.data) })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const liveIncl = inclTax(form.sales_price, form.tax_percent)

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

            <div>
              <label className="label">Tax / GST (%)</label>
              <div className="relative">
                <input className="input pr-8" type="number" min="0" max="100" step="0.5" placeholder="0"
                  value={form.tax_percent} onChange={e => set('tax_percent', e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm select-none">%</span>
              </div>
              <div className="flex gap-1 mt-1.5">
                {[0, 5, 12, 18, 28].map(t => (
                  <button key={t} type="button" onClick={() => set('tax_percent', t)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      parseFloat(form.tax_percent) === t
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                  >{t}%</button>
                ))}
              </div>
            </div>

            {parseFloat(form.tax_percent) > 0 && parseFloat(form.sales_price) > 0 && (
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                <span className="text-xs text-indigo-600 font-semibold">Price incl. {form.tax_percent}% GST</span>
                <span className="text-sm font-extrabold text-indigo-700">{fmtPrice(liveIncl)}</span>
              </div>
            )}

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

const EmptyState = ({ onAction, canEdit }) => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
      <Package size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No products registered</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Add products to your catalog to start managing inventory levels, processing sales orders, and tracking manufacturing processes.
    </p>
    {canEdit && (
      <button className="btn-primary" onClick={onAction}>
        <Plus size={16} /> Create First Product
      </button>
    )}
  </div>
)

function RawMaterialsModal({ product, onClose }) {
  const { data: boms, isLoading } = useQuery({
    queryKey: ['boms', product.id],
    queryFn: () => api.get('/manufacturing/boms', { params: { product_id: product.id } }).then(r => r.data),
  })

  const activeBom = boms?.find(b => b.is_active === 'Y') || boms?.[0]

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-lg animate-in">
        <div className="modal-header">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Raw Materials</h3>
            <p className="text-xs text-slate-500 mt-0.5">{product.name}</p>
          </div>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}
            </div>
          ) : !activeBom ? (
            <div className="text-center py-10">
              <FlaskConical size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No Bill of Materials found</p>
              <p className="text-xs text-slate-400 mt-1">Create a BoM in the Manufacturing module to define raw materials.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
                <span>BoM: <span className="font-semibold text-slate-700">{activeBom.name}</span></span>
                <span>Version: <span className="font-semibold text-slate-700">{activeBom.version}</span></span>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Component</th>
                    <th className="th text-right">Qty Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBom.lines?.map(line => (
                    <tr key={line.id} className="tr-hover">
                      <td className="td font-semibold text-slate-800">{line.component_name}</td>
                      <td className="td text-right font-bold text-indigo-600">{Number(line.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {boms.length > 1 && (
                <p className="text-xs text-slate-400 text-center">
                  Showing active BoM — {boms.length} total BoMs exist for this product.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-white">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canEdit = ['admin', 'owner'].includes(user?.role)
  const canAdjustStock = ['admin', 'owner', 'inventory'].includes(user?.role)
  const canRunReorder = ['admin', 'owner', 'purchase'].includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pricingProduct, setPricingProduct] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [viewingMaterials, setViewingMaterials] = useState(null)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', category: '', low_stock: false, sort_by: 'name', sort_order: 'asc' })
  useEffect(() => { setPage(1) }, [filters])

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', filters, page],
    queryFn: () => {
      const params = { sort_by: filters.sort_by, sort_order: filters.sort_order, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (filters.search) params.search = filters.search
      if (filters.category) params.category = filters.category
      if (filters.low_stock) params.low_stock = true
      return api.get('/products', { params }).then(r => r.data)
    },
  })

  const hasFilters = filters.search || filters.category || filters.low_stock

  const createMut = useMutation({
    mutationFn: (data) => api.post('/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setShowForm(false); toast.success('Product created successfully') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to create product'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setEditing(null); toast.success('Product updated successfully') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to update product'),
  })

  const adjustMut = useMutation({
    mutationFn: ({ id, qty }) => api.post(`/products/${id}/adjust-stock`, { qty: parseFloat(qty) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setAdjusting(null); setAdjustQty(''); toast.success('Stock level adjusted') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to adjust stock'),
  })

  const reorderMut = useMutation({
    mutationFn: () => api.post('/procurement/run-reorder'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      const d = res.data
      toast.success(`Reorder complete — ${d.purchase_orders_created ?? 0} POs, ${d.manufacturing_orders_created ?? 0} MOs created`)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Reorder run failed'),
  })

  const handleSave = (form) => {
    const data = { ...form, vendor_id: form.vendor_id || null, procurement_type: form.procurement_type || null }
    if (editing) updateMut.mutate({ id: editing.id, data })
    else createMut.mutate(data)
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <div className="page-icon bg-amber-50 text-amber-800">
            <Package size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Products</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage items, stock levels, procurement rules, and pricing.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRunReorder && (
            <button
              className="btn-secondary"
              onClick={() => reorderMut.mutate()}
              disabled={reorderMut.isPending}
              title="Trigger MTS reorder for all products below reorder point"
            >
              <RefreshCw size={15} className={reorderMut.isPending ? 'animate-spin' : ''} />
              {reorderMut.isPending ? 'Running…' : 'Run Reorder'}
            </button>
          )}
          {canEdit && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> New Product
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <div className="relative flex-1 min-w-[180px]">
          <input
            className="input py-2 text-sm"
            placeholder="Search name, category, description…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <input
          className="input py-2 text-sm w-32"
          placeholder="Category"
          value={filters.category}
          onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
        />
        <select className="input py-2 text-sm w-36" value={filters.sort_by} onChange={e => setFilters(f => ({ ...f, sort_by: e.target.value }))}>
          <option value="name">Sort: Name</option>
          <option value="sales_price">Sort: Price</option>
          <option value="on_hand_qty">Sort: Stock</option>
          <option value="created_at">Sort: Date</option>
        </select>
        <select className="input py-2 text-sm w-24" value={filters.sort_order} onChange={e => setFilters(f => ({ ...f, sort_order: e.target.value }))}>
          <option value="asc">Asc ↑</option>
          <option value="desc">Desc ↓</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
          <input type="checkbox" className="rounded accent-amber-500" checked={filters.low_stock} onChange={e => setFilters(f => ({ ...f, low_stock: e.target.checked }))} />
          <span className="text-amber-700 font-semibold text-xs">Low Stock Only</span>
        </label>
        {hasFilters && (
          <button className="btn-secondary py-1.5 px-3 text-xs ml-auto" onClick={() => setFilters({ search: '', category: '', low_stock: false, sort_by: 'name', sort_order: 'asc' })}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : !products?.length ? (
        <EmptyState onAction={() => setShowForm(true)} canEdit={canEdit} />
      ) : (
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="th">Product</th>
                  <th className="th-amount">Sale Price</th>
                  <th className="th-amount">Cost</th>
                  <th className="th">Stock Level</th>
                  <th className="th">Strategy</th>
                  <th className="th">Status</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => {
                  const onHand = Number(p.on_hand_qty) || 0
                  const reserved = Number(p.reserved_qty) || 0
                  const free = Number(p.free_to_use_qty) || 0
                  const reorder = Number(p.reorder_point) || 0
                  const isLow = onHand <= reorder && onHand >= 0
                  const isCritical = free <= 0 && onHand > 0
                  const pctUsed = onHand > 0 ? Math.min(100, Math.round((reserved / onHand) * 100)) : 0
                  return (
                    <tr key={p.id} className={`tr-hover ${isLow ? 'bg-amber-50/40' : ''}`}>
                      <td className="td">
                        <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                        {p.category && <div className="text-xs text-slate-400 mt-0.5">{p.category} · {p.unit_of_measure}</div>}
                      </td>
                      <td className="td-amount text-sm cursor-pointer group/price" onClick={() => canEdit && setPricingProduct(p)}>
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{fmtPrice(p.sales_price)}</span>
                          {parseFloat(p.tax_percent) > 0 && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">{p.tax_percent}%</span>
                          )}
                        </div>
                        {parseFloat(p.tax_percent) > 0 && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 tabular-nums text-right">
                            {fmtPrice(inclTax(p.sales_price, p.tax_percent))} incl. GST
                          </div>
                        )}
                        {canEdit && (
                          <div className="text-[10px] text-indigo-400 opacity-0 group-hover/price:opacity-100 transition-opacity text-right mt-0.5">
                            click to edit
                          </div>
                        )}
                      </td>
                      <td className="td text-right text-slate-500 text-sm tabular-nums">{fmtPrice(p.cost_price)}</td>
                      <td className="td min-w-[160px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-bold ${isCritical ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {onHand} on hand
                          </span>
                          {isLow && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Low</span>}
                        </div>
                        <div className="stock-bar w-full">
                          <div
                            className={isCritical ? 'stock-fill-critical' : isLow ? 'stock-fill-low' : 'stock-fill-ok'}
                            style={{ width: `${Math.min(100, onHand > 0 ? 100 : 0)}%` }}
                          />
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                          <span><span className="text-amber-600 font-semibold">{reserved}</span> reserved</span>
                          <span><span className="text-emerald-600 font-semibold">{free}</span> free</span>
                        </div>
                      </td>
                      <td className="td">
                        <span className={`badge text-[10px] uppercase font-bold tracking-wide ${p.procurement_strategy === 'mts' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>
                          {p.procurement_strategy}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{p.procurement_type}</div>
                      </td>
                      <td className="td">
                        <StatusBadge active={p.is_active} />
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button className="btn-icon text-indigo-600 hover:bg-indigo-50" onClick={() => setEditing(p)} title="Edit Product">
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canEdit && (
                            <button className="btn-icon text-amber-600 hover:bg-amber-50" onClick={() => setPricingProduct(p)} title="Edit Pricing & Tax">
                              <IndianRupee size={16} />
                            </button>
                          )}
                          {canAdjustStock && (
                            <button className="btn-icon text-emerald-600 hover:bg-emerald-50" onClick={() => setAdjusting(p)} title="Adjust Stock">
                              <TrendingUp size={16} />
                            </button>
                          )}
                          {user?.role === 'admin' && (
                            <button className="btn-icon text-violet-600 hover:bg-violet-50" onClick={() => setViewingMaterials(p)} title="View Raw Materials">
                              <FlaskConical size={16} />
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
          <Pagination page={page} count={products?.length ?? 0} onPageChange={setPage} />
        </div>
      )}

      {(showForm || editing) && (
        <ProductForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {pricingProduct && (
        <PricingModal product={pricingProduct} onClose={() => setPricingProduct(null)} />
      )}

      {viewingMaterials && (
        <RawMaterialsModal product={viewingMaterials} onClose={() => setViewingMaterials(null)} />
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
