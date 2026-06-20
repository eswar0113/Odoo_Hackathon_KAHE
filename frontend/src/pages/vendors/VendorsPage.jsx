import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2 } from 'lucide-react'
import api from '../../api/client'

function VendorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', email: '', phone: '', address: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">{initial ? 'Edit Vendor' : 'New Vendor'}</h3>
        <div className="space-y-3">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address} onChange={e => set('address', e.target.value)} /></div>
        </div>
        <div className="flex gap-3 mt-4 justify-end">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function VendorsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const { data: vendors, isLoading } = useQuery({ queryKey: ['vendors'], queryFn: () => api.get('/vendors').then(r => r.data) })
  const createMut = useMutation({ mutationFn: d => api.post('/vendors', d), onSuccess: () => { qc.invalidateQueries(['vendors']); setShowForm(false); toast.success('Vendor created') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })
  const updateMut = useMutation({ mutationFn: ({ id, data }) => api.put(`/vendors/${id}`, data), onSuccess: () => { qc.invalidateQueries(['vendors']); setEditing(null); toast.success('Vendor updated') }, onError: e => toast.error(e.response?.data?.detail || 'Error') })
  const handleSave = (form) => editing ? updateMut.mutate({ id: editing.id, data: form }) : createMut.mutate(form)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vendors</h2>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}><Plus size={18} /> New Vendor</button>
      </div>
      {isLoading ? <div className="text-gray-500">Loading…</div> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors?.map(v => (
            <div key={v.id} className="card flex justify-between items-start">
              <div>
                <div className="font-semibold text-gray-900">{v.name}</div>
                {v.email && <div className="text-sm text-gray-500">{v.email}</div>}
                {v.phone && <div className="text-sm text-gray-500">{v.phone}</div>}
                {v.address && <div className="text-xs text-gray-400 mt-1">{v.address}</div>}
              </div>
              <button className="p-1 text-blue-600" onClick={() => setEditing(v)}><Edit2 size={16} /></button>
            </div>
          ))}
          {!vendors?.length && <p className="text-gray-400">No vendors yet</p>}
        </div>
      )}
      {(showForm || editing) && <VendorForm initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null) }} />}
    </div>
  )
}
