import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'

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

export default function AuditPage() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" />

  const { data: logs, isLoading } = useQuery({ 
    queryKey: ['audit'], 
    queryFn: () => api.get('/audit').then(r => r.data) 
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-1">Review chronological records of database adjustments, inventory changes, and order status transitions.</p>
        </div>
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
                <tr>
                  {['Timestamp', 'Action Type', 'Record/Entity', 'Reference Code', 'Notes / Changes'].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => {
                  let formattedChanges = '—'
                  if (log.new_values) {
                    try {
                      formattedChanges = typeof log.new_values === 'object' 
                        ? JSON.stringify(log.new_values)
                        : String(log.new_values)
                    } catch {
                      formattedChanges = String(log.new_values)
                    }
                  } else if (log.notes) {
                    formattedChanges = log.notes
                  }
                  
                  return (
                    <tr key={log.id} className="tr-hover">
                      <td className="td text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {log.created_at 
                          ? new Date(log.created_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            }) 
                          : '—'}
                      </td>
                      <td className="td">
                        {actionBadge(log.action)}
                      </td>
                      <td className="td text-sm font-semibold text-slate-800 capitalize">
                        {log.entity_type?.replace(/_/g, ' ')}
                      </td>
                      <td className="td font-mono text-xs font-bold text-slate-700">
                        {log.entity_name || '—'}
                      </td>
                      <td className="td text-xs text-slate-500 max-w-sm truncate" title={formattedChanges}>
                        <code className="bg-slate-50 border border-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-[10px] block truncate">
                          {formattedChanges}
                        </code>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
