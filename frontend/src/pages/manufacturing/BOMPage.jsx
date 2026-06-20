import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, ArrowLeft, Trash2 } from 'lucide-react'
import api from '../../api/client'

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
    onSuccess: () => { qc.invalidateQueries(['boms']); onClose(); toast.success('BoM created') },
    onError: e => toast.error(e.response?.data?.detail || 'Error'),
  })

  const handleSave = () => {
    mut.mutate({
      ...form,
      lines: lines.map(l => ({ ...l, qty: parseFloat(l.qty) })),
      operations: ops.map(o => ({ ...o, work_center_id: o.work_center_id || null, duration_minutes: parseInt(o.duration_minutes), sequence: parseInt(o.sequence) })),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <h3 className="text-lg font-bold mb-4">New Bill of Materials</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="col-span-2"><label className="label">Product *</label>
            <select className="input" value={form.product_id} onChange={e => { set('product_id', e.target.value); const p = products?.find(x => x.id === e.target.value); if (p) set('name', `BoM - ${p.name}`) }}>
              <option value="">Select product…</option>
              {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="label">Version</label><input className="input" value={form.version} onChange={e => set('version', e.target.value)} /></div>
          <div className="col-span-3"><label className="label">BoM Name</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-2"><label className="label mb-0 font-semibold">Components</label>
            <button className="text-sm text-blue-600" onClick={addLine}>+ Add Component</button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
              <div className="col-span-8">
                <select className="input text-sm" value={line.component_id} onChange={e => setLine(i, 'component_id', e.target.value)}>
                  <option value="">Component…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-3"><input className="input text-sm" type="number" placeholder="Qty" value={line.qty} onChange={e => setLine(i, 'qty', e.target.value)} /></div>
              <div className="col-span-1"><button className="text-red-500 text-lg" onClick={() => removeLine(i)}>×</button></div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-2"><label className="label mb-0 font-semibold">Operations</label>
            <button className="text-sm text-blue-600" onClick={addOp}>+ Add Operation</button>
          </div>
          {ops.map((op, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
              <div className="col-span-4"><input className="input text-sm" placeholder="Operation name" value={op.operation_name} onChange={e => setOp(i, 'operation_name', e.target.value)} /></div>
              <div className="col-span-3">
                <select className="input text-sm" value={op.work_center_id} onChange={e => setOp(i, 'work_center_id', e.target.value)}>
                  <option value="">Work Center…</option>
                  {workCenters?.map(wc => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><input className="input text-sm" type="number" placeholder="Mins" value={op.duration_minutes} onChange={e => setOp(i, 'duration_minutes', e.target.value)} /></div>
              <div className="col-span-2"><input className="input text-sm" type="number" placeholder="Seq" value={op.sequence} onChange={e => setOp(i, 'sequence', e.target.value)} /></div>
              <div className="col-span-1"><button className="text-red-500 text-lg" onClick={() => removeOp(i)}>×</button></div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={mut.isPending}>Save BoM</button>
        </div>
      </div>
    </div>
  )
}

export default function BOMPage() {
  const [showNew, setShowNew] = useState(false)
  const { data: boms, isLoading } = useQuery({ queryKey: ['boms'], queryFn: () => api.get('/manufacturing/boms').then(r => r.data) })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/manufacturing" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
          <h2 className="text-2xl font-bold text-gray-900">Bills of Materials</h2>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowNew(true)}><Plus size={18} /> New BoM</button>
      </div>
      {isLoading ? <div className="text-gray-500">Loading…</div> : (
        <div className="space-y-4">
          {boms?.map(bom => (
            <div key={bom.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-gray-900">{bom.name}</div>
                  <div className="text-xs text-gray-500">v{bom.version} · {bom.is_active === 'Y' ? <span className="text-green-600">Active</span> : <span className="text-gray-400">Inactive</span>}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Components ({bom.lines?.length})</div>
                  <div className="space-y-1">
                    {bom.lines?.map(l => (
                      <div key={l.id} className="flex justify-between text-sm">
                        <span>{l.component_name}</span>
                        <span className="font-semibold">{Number(l.qty).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Operations ({bom.operations?.length})</div>
                  <div className="space-y-1">
                    {bom.operations?.map(o => (
                      <div key={o.id} className="flex justify-between text-sm">
                        <span>{o.sequence}. {o.operation_name}</span>
                        <span className="text-gray-500">{o.duration_minutes}min</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!boms?.length && <p className="text-gray-400">No BoMs yet</p>}
        </div>
      )}
      {showNew && <BOMForm onClose={() => setShowNew(false)} />}
    </div>
  )
}
