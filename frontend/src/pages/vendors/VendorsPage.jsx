import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, X, Building2, Mail, Phone, MapPin, Search } from 'lucide-react'
import api from '../../api/client'
import Pagination, { PAGE_SIZE } from '../../components/Pagination'
import { useAuth } from '../../context/AuthContext'

function VendorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', email: '', phone: '', address: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md animate-in">
        <div className="modal-header">
          <h3 className="text-lg font-bold text-slate-900">{initial ? 'Edit Vendor Details' : 'New Vendor Profile'}</h3>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Company Name *</label>
            <input className="input" placeholder="e.g. Acme Timber Corp" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          
          <div>
            <label className="label">Contact Email</label>
            <input className="input" type="email" placeholder="vendor@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="e.g. +91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          
          <div>
            <label className="label">Mailing Address</label>
            <textarea className="input" rows={2} placeholder="Office or warehouse address..." value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end bg-white">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(form)}>Save Profile</button>
        </div>
      </div>
    </div>
  )
}

const CardsSkeleton = () => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="card h-40 bg-slate-50 border border-slate-100 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded w-2/3"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
      </div>
    ))}
  </div>
)

const EmptyState = ({ onAction, canEdit }) => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
      <Building2 size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No vendors registered</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Add vendor contacts to handle procurement, record supplier orders, and track manufacturing material pipelines.
    </p>
    {canEdit && (
      <button className="btn-primary" onClick={onAction}>
        <Plus size={16} /> Create First Vendor
      </button>
    )}
  </div>
)

export default function VendorsPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const canEdit = ['admin', 'owner'].includes(user?.role)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [search])

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors', search, page],
    queryFn: () => api.get('/vendors', {
      params: { skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, ...(search ? { search } : {}) }
    }).then(r => r.data),
  })

  const createMut = useMutation({ 
    mutationFn: d => api.post('/vendors', d), 
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setShowForm(false); toast.success('Vendor registered successfully') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to register vendor') 
  })

  const updateMut = useMutation({ 
    mutationFn: ({ id, data }) => api.put(`/vendors/${id}`, data), 
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setEditing(null); toast.success('Vendor profile updated') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update vendor') 
  })

  const handleSave = (form) => {
    if (!form.name) return toast.error('Vendor name is required')
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form })
    } else {
      createMut.mutate(form)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <div className="page-icon bg-rose-50 text-rose-800">
            <Building2 size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Vendors</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage material suppliers, contact details, and business profiles.</p>
          </div>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> New Vendor
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <input
          className="input py-2 text-sm flex-1"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="btn-icon text-slate-400 hover:text-slate-600" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : !vendors?.length ? (
        <EmptyState onAction={() => setShowForm(true)} canEdit={canEdit} />
      ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map(v => {
            const ini = v.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            return (
              <div key={v.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-200 relative group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-indigo-400 to-blue-500" />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                      {ini}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 leading-snug truncate">{v.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500 mt-0.5 inline-block">Supplier Partner</span>
                    </div>
                    {canEdit && (
                      <button className="btn-icon text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-all" onClick={() => setEditing(v)} title="Edit Profile">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail size={12} className="text-slate-300 flex-shrink-0" />
                      <span className="truncate">{v.email || <span className="text-slate-300 italic">No email</span>}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={12} className="text-slate-300 flex-shrink-0" />
                      <span>{v.phone || <span className="text-slate-300 italic">No phone</span>}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-400">
                      <MapPin size={12} className="text-slate-300 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{v.address || <span className="text-slate-300 italic">No address</span>}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <Pagination page={page} count={vendors?.length ?? 0} onPageChange={setPage} />
        </>
      )}

      {(showForm || editing) && (
        <VendorForm 
          initial={editing} 
          onSave={handleSave} 
          onCancel={() => { setShowForm(false); setEditing(null) }} 
        />
      )}
    </div>
  )
}
