import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

const actionColor = (action) => ({
  CREATE: 'text-green-600', UPDATE: 'text-blue-600', DELETE: 'text-red-600',
  CONFIRM: 'text-blue-700', DELIVER: 'text-purple-600', RECEIVE: 'text-purple-600',
  CANCEL: 'text-red-500', AUTO_CREATE: 'text-orange-600', PRODUCE: 'text-green-700',
  STOCK_ADJUST: 'text-yellow-700',
}[action] || 'text-gray-600')

export default function AuditPage() {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" />

  const { data: logs, isLoading } = useQuery({ queryKey: ['audit'], queryFn: () => api.get('/audit').then(r => r.data) })

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h2>
      {isLoading ? <div className="text-gray-500">Loading…</div> : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>{['Time', 'Action', 'Entity', 'Reference', 'Changes'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs?.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                  </td>
                  <td className={`px-4 py-3 text-sm font-bold ${actionColor(log.action)}`}>{log.action}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{log.entity_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">{log.entity_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {log.new_values ? JSON.stringify(log.new_values) : log.notes || '—'}
                  </td>
                </tr>
              ))}
              {!logs?.length && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No audit logs</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
