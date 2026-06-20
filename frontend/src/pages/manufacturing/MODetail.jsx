import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Play, Hammer, XCircle, PlayCircle, StopCircle } from 'lucide-react'
import api from '../../api/client'

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed', in_progress: 'badge-partial',
  done: 'badge-done', cancelled: 'badge-cancelled', pending: 'badge-draft',
}[s] || 'badge-draft')

export default function MODetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: mo, isLoading } = useQuery({ queryKey: ['manufacturing', id], queryFn: () => api.get(`/manufacturing/orders/${id}`).then(r => r.data) })

  const mut = (path, msg) => useMutation({
    mutationFn: () => api.post(`/manufacturing/orders/${id}/${path}`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success(msg) },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  const confirmMut = mut('confirm', 'Confirmed')
  const startMut = mut('start', 'Started')
  const produceMut = mut('produce', 'Production complete! Stock updated.')
  const cancelMut = mut('cancel', 'Cancelled')

  const woStartMut = useMutation({
    mutationFn: (wo_id) => api.post(`/manufacturing/orders/${id}/work-orders/${wo_id}/start`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('Work order started') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  const woDoneMut = useMutation({
    mutationFn: (wo_id) => api.post(`/manufacturing/orders/${id}/work-orders/${wo_id}/done`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('Work order done') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  if (isLoading) return <div className="text-gray-500">Loading…</div>
  if (!mo) return <div>Not found</div>

  return (
    <div>
      <button onClick={() => navigate('/manufacturing')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} /> Back to Manufacturing
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{mo.name}</h2>
          {mo.origin_ref && <div className="text-xs text-gray-400">Origin: {mo.origin_ref}</div>}
          <span className={`${statusBadge(mo.status)} mt-1`}>{mo.status.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex gap-2">
          {mo.status === 'draft' && <button className="btn-primary flex items-center gap-2" onClick={() => confirmMut.mutate()}><CheckCircle size={16} /> Confirm</button>}
          {mo.status === 'confirmed' && <button className="btn-primary flex items-center gap-2" onClick={() => startMut.mutate()}><Play size={16} /> Start</button>}
          {mo.status === 'in_progress' && <button className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700" onClick={() => produceMut.mutate()}><Hammer size={16} /> Mark Produced</button>}
          {!['done', 'cancelled'].includes(mo.status) && <button className="btn-danger flex items-center gap-2" onClick={() => cancelMut.mutate()}><XCircle size={16} /> Cancel</button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card"><div className="text-sm text-gray-500">Product</div><div className="font-semibold">{mo.product_name}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Planned Qty</div><div className="font-semibold text-xl">{Number(mo.qty_planned).toFixed(0)}</div></div>
        <div className="card"><div className="text-sm text-gray-500">Produced</div><div className="font-semibold text-xl text-green-600">{Number(mo.qty_produced).toFixed(0)}</div></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Components */}
        <div className="card">
          <h3 className="font-semibold mb-4">Components</h3>
          <table className="w-full">
            <thead><tr className="text-xs font-semibold text-gray-500 uppercase border-b">
              <th className="pb-2 text-left">Component</th>
              <th className="pb-2 text-right">Planned</th>
              <th className="pb-2 text-right">Consumed</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {mo.components?.map(c => (
                <tr key={c.id}>
                  <td className="py-2 font-medium text-sm">{c.product_name}</td>
                  <td className="py-2 text-right">{Number(c.qty_planned).toFixed(0)}</td>
                  <td className="py-2 text-right text-green-600">{Number(c.qty_consumed).toFixed(0)}</td>
                </tr>
              ))}
              {!mo.components?.length && <tr><td colSpan={3} className="py-4 text-center text-gray-400 text-sm">No components</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Work Orders */}
        <div className="card">
          <h3 className="font-semibold mb-4">Work Orders</h3>
          <div className="space-y-2">
            {mo.work_orders?.map(wo => (
              <div key={wo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{wo.sequence}. {wo.operation_name}</div>
                  <div className="text-xs text-gray-500">{wo.work_center_name || 'No work center'} · {wo.duration_minutes}min</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={statusBadge(wo.status)}>{wo.status}</span>
                  {wo.status === 'pending' && mo.status === 'in_progress' && (
                    <button className="p-1 text-yellow-600" onClick={() => woStartMut.mutate(wo.id)} title="Start"><PlayCircle size={16} /></button>
                  )}
                  {wo.status === 'in_progress' && (
                    <button className="p-1 text-green-600" onClick={() => woDoneMut.mutate(wo.id)} title="Done"><StopCircle size={16} /></button>
                  )}
                </div>
              </div>
            ))}
            {!mo.work_orders?.length && <p className="text-sm text-gray-400">No work orders</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
