import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { UserCog, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import api from '../../api/client'

const ROLES = ['sales', 'purchase', 'manufacturing', 'inventory', 'owner', 'admin']

const roleBadge = {
  admin:         'bg-rose-100 text-rose-700',
  owner:         'bg-violet-100 text-violet-700',
  sales:         'bg-emerald-100 text-emerald-700',
  purchase:      'bg-blue-100 text-blue-700',
  manufacturing: 'bg-amber-100 text-amber-700',
  inventory:     'bg-teal-100 text-teal-700',
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/auth/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditingId(null)
      toast.success('User updated')
    },
    onError: e => toast.error(e.response?.data?.detail || 'Update failed'),
  })

  const toggleActive = (user) => {
    updateMut.mutate({ id: user.id, payload: { is_active: !user.is_active } })
  }

  const saveRole = (user) => {
    if (editRole === user.role) { setEditingId(null); return }
    updateMut.mutate({ id: user.id, payload: { role: editRole } })
  }

  if (isLoading) return <div className="h-40 bg-slate-200 animate-pulse rounded-2xl" />

  const activeCount = users?.filter(u => u.is_active).length ?? 0
  const inactiveCount = users?.filter(u => !u.is_active).length ?? 0

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <div className="page-icon bg-purple-50 text-purple-800">
            <UserCog size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">User Management</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage accounts, roles, and access permissions for all ERP users.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl font-semibold">
            <CheckCircle size={13} /> {activeCount} active
          </div>
          <div className="flex items-center gap-1.5 text-sm bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl font-semibold">
            <XCircle size={13} /> {inactiveCount} inactive
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="th">User</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Joined</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users?.map(user => (
                <tr key={user.id} className={`tr-hover ${!user.is_active ? 'opacity-60' : ''}`}>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${roleBadge[user.role] || 'bg-slate-100 text-slate-600'}`}>
                        {user.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{user.full_name}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{user.role}</div>
                      </div>
                    </div>
                  </td>

                  <td className="td text-slate-500 text-sm">{user.email}</td>

                  <td className="td">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select className="input py-1 text-sm w-36" value={editRole} onChange={e => setEditRole(e.target.value)}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button className="btn-primary py-1 px-3 text-xs" onClick={() => saveRole(user)}>Save</button>
                        <button className="btn-secondary py-1 px-2 text-xs" onClick={() => setEditingId(null)}>✕</button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${roleBadge[user.role] || 'bg-slate-100 text-slate-600'}`}>
                        {user.role}
                      </span>
                    )}
                  </td>

                  <td className="td">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {user.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="td text-slate-400 text-sm">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>

                  <td className="td">
                    <div className="flex items-center gap-1">
                      {editingId !== user.id && (
                        <button className="btn-icon text-indigo-600 hover:bg-indigo-50" title="Change Role" onClick={() => { setEditingId(user.id); setEditRole(user.role) }}>
                          <UserCog size={15} />
                        </button>
                      )}
                      <button
                        className={`btn-icon ${user.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        title={user.is_active ? 'Deactivate User' : 'Activate User'}
                        onClick={() => toggleActive(user)}
                        disabled={updateMut.isPending}
                      >
                        {user.is_active ? <XCircle size={15} /> : <RefreshCw size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
