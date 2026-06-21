import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, ArrowLeft, Trash2, X, BookOpen, Factory } from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

function WorkCenterPanel({ canEdit }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const { data: workCenters } = useQuery({ queryKey: ['work-centers'], queryFn: () => api.get('/manufacturing/work-centers').then(r => r.data) })
  const createMut = useMutation({
    mutationFn: d => api.post('/manufacturing/work-centers', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-centers'] }); setName(''); toast.success('Work center created') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create work center'),
  })
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Factory size={18} /></div>
        <h3 className="font-bold text-slate-800 text-base">Work Centers</h3>
        <span className="text-xs text-slate-400 font-semibold ml-auto">{workCenters?.length || 0} configured</span>
      </div>
      <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
        {workCenters?.length ? workCenters.map(wc => (
          <div key={wc.id} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <Factory size={14} className="text-amber-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-700">{wc.name}</span>
            {wc.description && <span className="text-xs text-slate-400 truncate">{wc.description}</span>}
          </div>
        )) : <p className="text-xs text-slate-400 text-center py-4">No work centers yet. Add one below.</p>}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <input className="input flex-1 text-sm" placeholder="e.g. Assembly Line" value={name} onChange={e => setName(e.target.value)} />
          <button className="btn-primary py-2 px-4 text-sm" onClick={() => { if (name.trim()) createMut.mutate({ name: name.trim() }) }} disabled={createMut.isPending}>
            <Plus size={14} /> Add
          </button>
        </div>
      )}
    </div>
  )
}

function BOMForm({ onClose }) {
  const qc = useQueryClient()
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => api.get('/products').then(r => r.data) })
  const { data: workCenters } = useQuery({ queryKey: ['work-centers'], queryFn: () => api.get('/manufacturing/work-centers').then(r => r.data) })
  const [form, setForm] = useState({ product_id: '', name: '', version: '1.0' })
  const [lines, setLines] = useState([{ component_id: '', qty: 1 }])
  const [ops, setOps] = useState([{ operation_name: '', work_center_id: '', duration_minutes: 30, sequence: 10 }])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setLine = (i, k, v) => setLines(l => l.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const setOp = (i, k, v) => setOps(o => o.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const addLine = () => setLines(l => [...l, { component_id: '', qty: 1 }])
  const addOp = () => setOps(o => [...o, { operation_name: '', work_center_id: '', duration_minutes: 30, sequence: (o.length + 1) * 10 }])
  const removeLine = (i) => setLines(l => l.filter((_, idx) => idx !== i))
  const removeOp = (i) => setOps(o => o.filter((_, idx) => idx !== i))

  const mut = useMutation({
    mutationFn: d => api.post('/manufacturing/boms', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boms'] }); onClose(); toast.success('Bill of Materials created') },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to create BoM'),
  })

  const handleSave = () => {
    if (!form.product_id) return toast.error('Please select a target product')
    if (lines.some(l => !l.component_id || !l.qty)) return toast.error('Please complete all component lines')
    
    mut.mutate({
      ...form,
      lines: lines.map(l => ({ ...l, qty: parseFloat(l.qty) })),
      operations: ops.map(o => ({ 
        ...o, 
        work_center_id: o.work_center_id || null, 
        duration_minutes: parseInt(o.duration_minutes), 
        sequence: parseInt(o.sequence) 
      })),
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-3xl animate-in">
        <div className="modal-header">
          <h3 className="text-lg font-bold text-slate-900">New Bill of Materials</h3>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label">Target Product *</label>
              <select className="input" value={form.product_id} onChange={e => { set('product_id', e.target.value); const p = products?.find(x => x.id === e.target.value); if (p) set('name', `BoM - ${p.name}`) }}>
                <option value="">Select product…</option>
                {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Version</label>
              <input className="input" placeholder="e.g. 1.0" value={form.version} onChange={e => set('version', e.target.value)} />
            </div>
            <div className="col-span-3">
              <label className="label">BoM Name</label>
              <input className="input" placeholder="e.g. Oak Chair Assembly Standard" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="label mb-0 font-semibold text-slate-800 text-sm">Components / Raw Materials</label>
              <button className="btn-secondary py-1.5 px-3 text-xs" onClick={addLine}>
                <Plus size={14} /> Add Component
              </button>
            </div>
            <div className="space-y-2.5 max-h-[25vh] overflow-y-auto pr-1">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 animate-in">
                  <div className="col-span-8">
                    <select className="input text-sm bg-white" value={line.component_id} onChange={e => setLine(i, 'component_id', e.target.value)}>
                      <option value="">Component Product…</option>
                      {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input className="input text-sm bg-white" type="number" min="1" placeholder="Qty" value={line.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
                  </div>
                  <div className="col-span-1 text-center">
                    <button className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => removeLine(i)} disabled={lines.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="label mb-0 font-semibold text-slate-800 text-sm">Operations / Routing steps</label>
              <button className="btn-secondary py-1.5 px-3 text-xs" onClick={addOp}>
                <Plus size={14} /> Add Operation
              </button>
            </div>
            <div className="space-y-2.5 max-h-[25vh] overflow-y-auto pr-1">
              {ops.map((op, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 animate-in">
                  <div className="col-span-4">
                    <input className="input text-sm bg-white" placeholder="Operation name" value={op.operation_name} onChange={e => setOp(i, 'operation_name', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <select className="input text-sm bg-white" value={op.work_center_id} onChange={e => setOp(i, 'work_center_id', e.target.value)}>
                      <option value="">Work Center…</option>
                      {workCenters?.map(wc => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm bg-white" type="number" min="1" placeholder="Mins" value={op.duration_minutes} onChange={e => setOp(i, 'duration_minutes', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm bg-white" type="number" min="1" placeholder="Seq" value={op.sequence} onChange={e => setOp(i, 'sequence', e.target.value)} />
                  </div>
                  <div className="col-span-1 text-center">
                    <button className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => removeOp(i)} disabled={ops.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end sticky bottom-0 bg-white">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={mut.isPending}>
            {mut.isPending ? 'Saving...' : 'Save Bill of Materials'}
          </button>
        </div>
      </div>
    </div>
  )
}

const DetailSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-6 bg-slate-200 rounded w-1/8"></div>
    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
      <div className="h-8 bg-slate-200 rounded w-1/3"></div>
      <div className="h-10 bg-slate-200 rounded w-1/4"></div>
    </div>
    <div className="space-y-4">
      <div className="h-36 bg-slate-200 rounded-2xl"></div>
      <div className="h-36 bg-slate-200 rounded-2xl"></div>
    </div>
  </div>
)

const EmptyState = ({ onAction, canEdit }) => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
      <BookOpen size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No Bills of Materials found</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Define a Bill of Materials (BoM) to outline the exact raw materials, quantities, and work routing steps needed to produce a final finished product.
    </p>
    {canEdit && (
      <button className="btn-primary" onClick={onAction}>
        <Plus size={16} /> Create First BoM
      </button>
    )}
  </div>
)

export default function BOMPage() {
  const [showNew, setShowNew] = useState(false)
  const { user } = useAuth()
  const canEdit = ['admin', 'owner', 'manufacturing'].includes(user?.role)
  const { data: boms, isLoading } = useQuery({
    queryKey: ['boms'],
    queryFn: () => api.get('/manufacturing/boms').then(r => r.data)
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Link to="/manufacturing" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Bills of Materials</h1>
            <p className="text-slate-500 text-sm mt-1">Configure formulas, material specifications, and production steps.</p>
          </div>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            <Plus size={18} /> New BoM
          </button>
        )}
      </div>

      <WorkCenterPanel canEdit={canEdit} />

      {isLoading ? (
        <DetailSkeleton />
      ) : !boms?.length ? (
        <EmptyState onAction={() => setShowNew(true)} canEdit={canEdit} />
      ) : (
        <div className="space-y-6">
          {boms.map(bom => (
            <div key={bom.id} className="card-hover">
              <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-snug">{bom.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-semibold">
                    <span>Version {bom.version}</span>
                    <span className="text-slate-300">•</span>
                    {bom.is_active === 'Y' ? (
                      <span className="badge-done py-0.5">Active</span>
                    ) : (
                      <span className="badge-draft py-0.5">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Components Required ({bom.lines?.length || 0})</div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 max-h-48 overflow-y-auto">
                    {bom.lines?.map(l => (
                      <div key={l.id} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 font-medium">{l.component_name}</span>
                        <span className="font-bold text-slate-900 bg-white border border-slate-100 px-2 py-0.5 rounded-lg text-xs">{Number(l.qty).toFixed(0)} units</span>
                      </div>
                    ))}
                    {!bom.lines?.length && (
                      <span className="text-xs text-slate-400 font-medium">No component inputs declared.</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Work Operations ({bom.operations?.length || 0})</div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 max-h-48 overflow-y-auto">
                    {bom.operations?.map(o => (
                      <div key={o.id} className="flex justify-between items-center text-sm">
                        <span className="text-slate-700 font-medium">{o.sequence}. {o.operation_name}</span>
                        <span className="font-bold text-slate-900 bg-white border border-slate-100 px-2 py-0.5 rounded-lg text-xs">{o.duration_minutes} min</span>
                      </div>
                    ))}
                    {!bom.operations?.length && (
                      <span className="text-xs text-slate-400 font-medium">No work center steps defined.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showNew && <BOMForm onClose={() => setShowNew(false)} />}
    </div>
  )
}
