import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle, Play, Hammer, XCircle, PlayCircle, StopCircle, Clipboard, Package, Settings } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const statusBadge = (s) => ({
  draft: 'badge-draft', confirmed: 'badge-confirmed', in_progress: 'badge-progress',
  done: 'badge-done', cancelled: 'badge-cancelled', pending: 'badge-draft',
}[s] || 'badge-draft')

const DetailSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-6 bg-slate-200 rounded w-1/8"></div>
    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
      <div className="space-y-2 w-1/3">
        <div className="h-8 bg-slate-200 rounded"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      </div>
      <div className="h-10 bg-slate-200 rounded w-1/4"></div>
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="h-24 bg-slate-200 rounded-2xl"></div>
      <div className="h-24 bg-slate-200 rounded-2xl"></div>
      <div className="h-24 bg-slate-200 rounded-2xl"></div>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div className="h-64 bg-slate-200 rounded-2xl"></div>
      <div className="h-64 bg-slate-200 rounded-2xl"></div>
    </div>
  </div>
)

export default function MODetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const canCreate = ['admin', 'owner', 'manufacturing'].includes(user?.role)
  const canCancel  = ['admin', 'owner'].includes(user?.role)

  const { data: mo, isLoading } = useQuery({
    queryKey: ['manufacturing', id],
    queryFn: () => api.get(`/manufacturing/orders/${id}`).then(r => r.data)
  })

  const confirmMut = useMutation({
    mutationFn: () => api.post(`/manufacturing/orders/${id}/confirm`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('MO confirmed successfully') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })
  const startMut = useMutation({
    mutationFn: () => api.post(`/manufacturing/orders/${id}/start`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('Production started') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })
  const produceMut = useMutation({
    mutationFn: () => api.post(`/manufacturing/orders/${id}/produce`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('Production completed! Inventory updated.') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })
  const cancelMut = useMutation({
    mutationFn: () => api.post(`/manufacturing/orders/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('MO cancelled') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  const woStartMut = useMutation({
    mutationFn: (wo_id) => api.post(`/manufacturing/orders/${id}/work-orders/${wo_id}/start`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('Work order started') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  const woDoneMut = useMutation({
    mutationFn: (wo_id) => api.post(`/manufacturing/orders/${id}/work-orders/${wo_id}/done`),
    onSuccess: () => { qc.invalidateQueries(['manufacturing', id]); toast.success('Work order marked done') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  if (isLoading) return <DetailSkeleton />
  if (!mo) return <div className="card text-center py-12 text-slate-500 font-semibold">Manufacturing order details not found.</div>

  return (
    <div className="space-y-6 animate-in">
      <div>
        <button onClick={() => navigate('/manufacturing')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider mb-4">
          <ArrowLeft size={14} /> Back to Manufacturing List
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{mo.name}</h1>
            <span className={`${statusBadge(mo.status)} capitalize`}>{mo.status.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 font-medium text-xs text-slate-500">
            <span>Record ID: <span className="font-mono text-slate-700">{mo.id}</span></span>
            {mo.origin_ref && (
              <span className="flex items-center gap-1">
                <Clipboard size={12} className="text-slate-400" />
                Origin: <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{mo.origin_ref}</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {canCreate && mo.status === 'draft' && (
            <button className="btn-primary" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
              <CheckCircle size={16} /> Confirm MO
            </button>
          )}
          {canCreate && mo.status === 'confirmed' && (
            <button className="btn-primary" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              <Play size={16} /> Start Production
            </button>
          )}
          {canCreate && mo.status === 'in_progress' && (
            <button className="btn-success" onClick={() => produceMut.mutate()} disabled={produceMut.isPending}>
              <Hammer size={16} /> Mark Produced
            </button>
          )}
          {canCancel && !['done', 'cancelled'].includes(mo.status) && (
            <button className="btn-danger" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              <XCircle size={16} /> Cancel MO
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="card flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Product</span>
            <div className="font-bold text-slate-900 text-base truncate">{mo.product_name}</div>
          </div>
        </div>

        <div className="card flex items-start gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <Settings size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Planned Qty</span>
            <div className="font-extrabold text-slate-900 text-2xl tracking-tight">{Number(mo.qty_planned).toFixed(0)}</div>
          </div>
        </div>

        <div className="card flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Produced Qty</span>
            <div className="font-extrabold text-emerald-600 text-2xl tracking-tight">{Number(mo.qty_produced).toFixed(0)}</div>
          </div>
        </div>

        <div className="card flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <PlayCircle size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assignee</span>
            <div className="font-bold text-slate-900 text-sm truncate">{mo.assignee_name || 'Unassigned'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Components */}
        <div className="table-wrapper">
          <div className="px-6 py-4 border-b border-slate-100 bg-white">
            <h3 className="font-bold text-slate-800 text-base">Raw Materials / Components</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Component Name', 'Planned Qty', 'Consumed Qty'].map(h => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mo.components?.map(c => (
                  <tr key={c.id} className="tr-hover">
                    <td className="td font-bold text-slate-800">{c.product_name}</td>
                    <td className="td font-semibold text-slate-600">{Number(c.qty_planned).toFixed(0)}</td>
                    <td className="td text-emerald-600 font-bold">{Number(c.qty_consumed).toFixed(0)}</td>
                  </tr>
                ))}
                {!mo.components?.length && (
                  <tr>
                    <td colSpan={3} className="td text-center text-slate-400 py-8 font-medium">No components declared for this order.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Work Orders */}
        <div className="card">
          <h3 className="font-bold text-slate-800 text-base mb-4 pb-2 border-b border-slate-100">Work Orders / Routing</h3>
          <div className="space-y-3">
            {mo.work_orders?.map(wo => (
              <div key={wo.id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl transition-all duration-150">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-sm">{wo.sequence}. {wo.operation_name}</div>
                  <div className="text-xs text-slate-400 font-semibold">
                    Work Center: <span className="text-slate-600">{wo.work_center_name || 'No work center'}</span> · Duration: <span className="text-slate-600">{wo.duration_minutes} min</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`${statusBadge(wo.status)} capitalize`}>{wo.status}</span>
                  {wo.status === 'pending' && mo.status === 'in_progress' && (
                    <button className="btn-icon bg-white border border-slate-200 text-amber-600 hover:bg-amber-50" onClick={() => woStartMut.mutate(wo.id)} title="Start Operation">
                      <PlayCircle size={16} />
                    </button>
                  )}
                  {wo.status === 'in_progress' && (
                    <button className="btn-icon bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50" onClick={() => woDoneMut.mutate(wo.id)} title="Complete Operation">
                      <StopCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!mo.work_orders?.length && (
              <p className="text-sm text-slate-400 text-center py-8 font-medium">No routing or work orders attached to this MO.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
