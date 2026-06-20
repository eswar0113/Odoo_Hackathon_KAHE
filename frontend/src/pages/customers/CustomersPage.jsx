import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus, Edit2, X, Users, Mail, Phone, MapPin } from 'lucide-react'
import api from '../../api/client'

function CustomerForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', email: '', phone: '', address: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md animate-in">
        <div className="modal-header">
          <h3 className="text-lg font-bold text-slate-900">{initial ? 'Edit Customer Details' : 'New Customer Profile'}</h3>
          <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Customer Name *</label>
            <input className="input" placeholder="e.g. John Doe" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="customer@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          
          <div>
            <label className="label">Phone Number</label>
            <input className="input" placeholder="e.g. +91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
          
          <div>
            <label className="label">Delivery Address</label>
            <textarea className="input" rows={2} placeholder="Residential or commercial shipping address..." value={form.address} onChange={e => set('address', e.target.value)} />
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

const EmptyState = ({ onAction }) => (
  <div className="card flex flex-col items-center justify-center text-center py-16 px-4 animate-in">
    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
      <Users size={32} />
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-1">No customers registered</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-6">
      Add customer profiles to record retail and bulk orders, manage shipments, and reference client details.
    </p>
    <button className="btn-primary" onClick={onAction}>
      <Plus size={16} /> Create First Customer
    </button>
  </div>
)

export default function CustomersPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  
  const { data: customers, isLoading } = useQuery({ 
    queryKey: ['customers'], 
    queryFn: () => api.get('/customers').then(r => r.data) 
  })

  const createMut = useMutation({ 
    mutationFn: d => api.post('/customers', d), 
    onSuccess: () => { qc.invalidateQueries(['customers']); setShowForm(false); toast.success('Customer registered successfully') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to register customer') 
  })

  const updateMut = useMutation({ 
    mutationFn: ({ id, data }) => api.put(`/customers/${id}`, data), 
    onSuccess: () => { qc.invalidateQueries(['customers']); setEditing(null); toast.success('Customer profile updated') }, 
    onError: e => toast.error(e.response?.data?.detail || 'Failed to update customer') 
  })

  const handleSave = (form) => {
    if (!form.name) return toast.error('Customer name is required')
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form })
    } else {
      createMut.mutate(form)
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage buyer profiles, delivery destinations, and client histories.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> New Customer
        </button>
      </div>

      {isLoading ? (
        <CardsSkeleton />
      ) : !customers?.length ? (
        <EmptyState onAction={() => setShowForm(true)} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map(c => {
            const initials = c.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
            return (
              <div key={c.id} className="card-hover flex flex-col justify-between h-44 relative group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 truncate leading-snug">{c.name}</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-violet-500 mt-1 inline-block">Registered Client</span>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 border-t border-slate-50 pt-3">
                  {c.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail size={13} className="text-slate-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={13} className="text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 line-clamp-1">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                </div>

                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button className="btn-icon bg-slate-50 text-indigo-600 hover:bg-indigo-50" onClick={() => setEditing(c)} title="Edit Profile">
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(showForm || editing) && (
        <CustomerForm 
          initial={editing} 
          onSave={handleSave} 
          onCancel={() => { setShowForm(false); setEditing(null) }} 
        />
      )}
    </div>
  )
}
