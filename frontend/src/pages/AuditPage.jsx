import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { ClipboardList, Search, X } from 'lucide-react'
import Pagination, { PAGE_SIZE } from '../components/Pagination'

const fmtTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtFullTime = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ENTITY_COLORS = {
  product: 'bg-sky-50 text-sky-700',
  sales_order: 'bg-indigo-50 text-indigo-700',
  purchase_order: 'bg-violet-50 text-violet-700',
  manufacturing_order: 'bg-amber-50 text-amber-700',
  bom: 'bg-teal-50 text-teal-700',
  user: 'bg-pink-50 text-pink-700',
}

const actionBadge = (action) => {
  const styles = {
    CREATE: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    UPDATE: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    DELETE: 'bg-rose-50 text-rose-700 border border-rose-100',
    CONFIRM: 'bg-blue-50 text-blue-700 border border-blue-100',
    DELIVER: 'bg-violet-50 text-violet-700 border border-violet-100',
    RECEIVE: 'bg-pink-50 text-pink-700 border border-pink-100',
    CANCEL: 'bg-red-50 text-red-700 border border-red-100',
    AUTO_CREATE: 'bg-amber-50 text-amber-700 border border-amber-100',
    PRODUCE: 'bg-teal-50 text-teal-700 border border-teal-100',
    STOCK_ADJUST: 'bg-yellow-50 text-yellow-800 border border-yellow-100',
  }[action] || 'bg-slate-50 text-slate-700 border border-slate-100'
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

const TableSkeleton = () => (
  <div className="table-wrapper animate-pulse">
    <div className="h-12 bg-slate-50 border-b border-slate-100"></div>
    <div className="divide-y divide-slate-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex px-5 py-4 gap-4 items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-1/5"></div>
          <div className="h-4 bg-slate-200 rounded w-1/8"></div>
          <div className="h-4 bg-slate-200 rounded w-1/8"></div>
          <div className="h-4 bg-slate-200 rounded w-1/6"></div>
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  </div>
)

const EmptyState = () => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-slate-100 text-slate-500 rounded-full mb-4">
      <ClipboardList size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No log logs recorded</h3>
    <p className="text-sm text-slate-500 max-w-sm">
      Activity logs will automatically populate as users log in, update inventories, dispatch sales, or create manufacturing orders.
    </p>
  </div>
)

const FIELD_LABELS = {
  sales_price: 'Sale price', cost_price: 'Cost', tax_percent: 'GST',
  name: 'Name', qty: 'Qty', status: 'Status', on_hand_qty: 'Stock',
  reorder_point: 'Reorder at', reorder_qty: 'Reorder qty',
  procurement_strategy: 'Strategy', procurement_type: 'Procurement',
  is_active: 'Active', full_name: 'Name', email: 'Email', role: 'Role',
  unit_price: 'Unit price', qty_ordered: 'Qty ordered',
  qty_delivered: 'Qty delivered', qty_received: 'Qty received',
  department: 'Department', phone: 'Phone', bio: 'Bio',
}

const fmtVal = (key, val) => {
  if (val === null || val === undefined || val === '') return '—'
  if (['sales_price', 'cost_price', 'unit_price'].includes(key))
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })
  if (key === 'tax_percent') return val + '%'
  if (val === true  || val === 'true')  return 'Yes'
  if (val === false || val === 'false') return 'No'
  return String(val)
}

const formatDetails = (log) => {
  const { old_values, new_values, notes } = log

  if (old_values && new_values) {
    const changes = Object.keys(new_values)
      .filter(k => String(old_values[k] ?? '') !== String(new_values[k] ?? ''))
      .map(k => `${FIELD_LABELS[k] || k}: ${fmtVal(k, old_values[k])} → ${fmtVal(k, new_values[k])}`)
    if (changes.length) return changes.join('  ·  ')
  }

  if (new_values && typeof new_values === 'object') {
    return Object.entries(new_values)
      .map(([k, v]) => `${FIELD_LABELS[k] || k}: ${fmtVal(k, v)}`)
      .join('  ·  ')
  }

  if (old_values && typeof old_values === 'object') {
    return 'Was: ' + Object.entries(old_values)
      .map(([k, v]) => `${FIELD_LABELS[k] || k}: ${fmtVal(k, v)}`)
      .join('  ·  ')
  }

  if (notes) return notes
  return null
}

const ENTITY_TYPES = ['product', 'sales_order', 'purchase_order', 'manufacturing_order', 'bom']
const ACTIONS = ['CREATE', 'UPDATE', 'CONFIRM', 'DELIVER', 'RECEIVE', 'CANCEL', 'PRODUCE', 'STOCK_ADJUST', 'AUTO_CREATE', 'START']

export default function AuditPage() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" />

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ search: '', entity_type: '', action: '', date_from: '', date_to: '' })
  const hasFilters = filters.search || filters.entity_type || filters.action || filters.date_from || filters.date_to
  useEffect(() => { setPage(1) }, [filters])

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit', filters, page],
    queryFn: () => {
      const params = { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (filters.search) params.entity_name = filters.search
      if (filters.entity_type) params.entity_type = filters.entity_type
      if (filters.action) params.action = filters.action
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      return api.get('/audit', { params }).then(r => r.data)
    },
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <div className="page-icon bg-stone-100 text-stone-700">
            <ClipboardList size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Audit Logs</h1>
            <p className="text-slate-500 text-sm mt-0.5">Chronological record of all inventory changes, order transitions, and system events.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <div className="relative flex-1 min-w-[160px]">
          <input
            className="input py-2 text-sm"
            placeholder="Search by record name…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <select className="input py-2 text-sm w-44" value={filters.entity_type} onChange={e => setFilters(f => ({ ...f, entity_type: e.target.value }))}>
          <option value="">All Modules</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="input py-2 text-sm w-40" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
          <option value="">All Actions</option>
          {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" className="input py-2 text-sm w-36" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} title="From date" />
        <input type="date" className="input py-2 text-sm w-36" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} title="To date" />
        {hasFilters && (
          <button className="btn-secondary py-1.5 px-3 text-xs ml-auto" onClick={() => setFilters({ search: '', entity_type: '', action: '', date_from: '', date_to: '' })}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : !logs?.length ? (
        <EmptyState />
      ) : (
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="th">When</th>
                  <th className="th">Action</th>
                  <th className="th">Module</th>
                  <th className="th">Record</th>
                  <th className="th">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => {
                  const details = formatDetails(log)
                  const entityColor = ENTITY_COLORS[log.entity_type] || 'bg-slate-50 text-slate-600'
                  return (
                    <tr key={log.id} className="tr-hover">
                      <td className="td whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-700" title={fmtFullTime(log.created_at)}>
                          {fmtTime(log.created_at)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{fmtFullTime(log.created_at)}</div>
                      </td>
                      <td className="td">{actionBadge(log.action)}</td>
                      <td className="td">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${entityColor}`}>
                          {log.entity_type?.replace(/_/g, ' ') || '—'}
                        </span>
                      </td>
                      <td className="td">
                        <div className="font-mono text-xs font-bold text-slate-800">{log.entity_name || '—'}</div>
                        {log.performed_by_name && (
                          <div className="text-[10px] text-slate-400 mt-0.5">by {log.performed_by_name}</div>
                        )}
                      </td>
                      <td className="td max-w-xs">
                        {details ? (
                          <span className="text-xs text-slate-600 leading-relaxed" title={details}>
                            {details}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} count={logs?.length ?? 0} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}
