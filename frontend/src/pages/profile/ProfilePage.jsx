import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  User, Mail, Phone, Briefcase, Lock, Eye, EyeOff, Save,
  Shield, ShoppingCart, Truck, Factory, Package, Users,
  Building2, ClipboardList, CheckCircle, Edit3, X, Info,
  KeyRound, BadgeCheck, Calendar, Activity
} from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const ROLE_META = {
  admin: {
    label: 'Administrator',
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-100',
    icon: Shield,
    desc: 'Full system access — manage users, all modules, and audit logs.',
    perms: [
      { icon: Users,        label: 'User Management',     detail: 'Create, edit, activate/deactivate accounts' },
      { icon: ClipboardList,label: 'Audit Logs',          detail: 'View all system activity and changes' },
      { icon: ShoppingCart, label: 'Sales & Customers',   detail: 'Manage all sales orders and deliveries' },
      { icon: Truck,        label: 'Purchase & Vendors',  detail: 'Create POs and manage vendors' },
      { icon: Factory,      label: 'Manufacturing',       detail: 'Schedule MOs and manage BOMs' },
      { icon: Package,      label: 'Inventory & Stock',   detail: 'Adjust stock and view all products' },
    ],
  },
  owner: {
    label: 'Business Owner',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-100',
    icon: BadgeCheck,
    desc: 'Full operational visibility across all modules — read, confirm, and cancel.',
    perms: [
      { icon: ShoppingCart, label: 'Sales Overview',      detail: 'View and confirm all sales orders' },
      { icon: Truck,        label: 'Purchase Overview',   detail: 'Approve and monitor purchase orders' },
      { icon: Factory,      label: 'Production View',     detail: 'Track manufacturing progress' },
      { icon: Package,      label: 'Stock View',          detail: 'Monitor inventory levels and alerts' },
      { icon: ClipboardList,label: 'Audit Logs',          detail: 'Review all operational changes' },
    ],
  },
  sales: {
    label: 'Sales Executive',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
    icon: ShoppingCart,
    desc: 'Manage customer orders, track deliveries, and maintain client relationships.',
    perms: [
      { icon: ShoppingCart, label: 'Sales Orders',   detail: 'Create, confirm, and deliver orders' },
      { icon: Users,        label: 'Customers',      detail: 'Manage customer profiles and contacts' },
      { icon: Package,      label: 'Products',       detail: 'View product catalog and stock levels' },
    ],
  },
  purchase: {
    label: 'Purchase Manager',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-100',
    icon: Truck,
    desc: 'Handle vendor procurement, purchase orders, and incoming inventory.',
    perms: [
      { icon: Truck,        label: 'Purchase Orders', detail: 'Create, confirm, and receive shipments' },
      { icon: Building2,    label: 'Vendors',         detail: 'Manage supplier profiles and contacts' },
      { icon: Package,      label: 'Products',        detail: 'View products and trigger reorder runs' },
    ],
  },
  manufacturing: {
    label: 'Production Operator',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-100',
    icon: Factory,
    desc: 'Plan and execute manufacturing orders, manage BOMs, and track production.',
    perms: [
      { icon: Factory,  label: 'Manufacturing Orders', detail: 'Create, start, and complete MOs' },
      { icon: Briefcase,label: 'Bill of Materials',    detail: 'View and use BOMs for production' },
      { icon: Package,  label: 'Products',             detail: 'View product catalog and BOM materials' },
    ],
  },
  inventory: {
    label: 'Inventory Controller',
    color: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-100',
    icon: Package,
    desc: 'Maintain stock accuracy, adjust inventory, and monitor product levels.',
    perms: [
      { icon: Package, label: 'Products & Stock',  detail: 'Full access to products and stock adjustments' },
      { icon: Activity,label: 'Stock Movements',   detail: 'Track every incoming and outgoing movement' },
    ],
  },
}

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

function PermCard({ icon: Icon, label, detail, color, border, bg }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${border} ${bg} group hover:shadow-sm transition-all`}>
      <div className={`p-1.5 rounded-lg bg-white shadow-sm flex-shrink-0 ${color}`}>
        <Icon size={14} />
      </div>
      <div>
        <div className={`text-xs font-bold ${color}`}>{label}</div>
        <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{detail}</div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user: authUser, refreshUser } = useAuth()
  const qc = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [showPwdSection, setShowPwdSection] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [form, setForm] = useState(null)
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setPwd = k => e => setPwdForm(f => ({ ...f, [k]: e.target.value }))

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/me').then(r => r.data),
  })

  useEffect(() => {
    if (profile && !form) setForm(profile)
  }, [profile])

  const updateMut = useMutation({
    mutationFn: d => api.patch('/auth/me', d),
    onSuccess: async () => {
      await refreshUser()
      qc.invalidateQueries({ queryKey: ['profile'] })
      setEditMode(false)
      toast.success('Profile updated!')
    },
    onError: e => toast.error(e.response?.data?.detail || 'Update failed'),
  })

  const pwdMut = useMutation({
    mutationFn: d => api.post('/auth/change-password', d),
    onSuccess: () => {
      setPwdForm({ current_password: '', new_password: '', confirm: '' })
      setShowPwdSection(false)
      toast.success('Password changed successfully')
    },
    onError: e => toast.error(e.response?.data?.detail || 'Failed to change password'),
  })

  const handleSave = () => {
    if (!form.full_name?.trim()) return toast.error('Name is required')
    updateMut.mutate({
      full_name: form.full_name,
      phone: form.phone || null,
      bio: form.bio || null,
      department: form.department || null,
    })
  }

  const handlePwdChange = () => {
    if (!pwdForm.current_password) return toast.error('Enter your current password')
    if (pwdForm.new_password.length < 6) return toast.error('New password must be at least 6 characters')
    if (pwdForm.new_password !== pwdForm.confirm) return toast.error('Passwords do not match')
    pwdMut.mutate({ current_password: pwdForm.current_password, new_password: pwdForm.new_password })
  }

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-48 bg-slate-200 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-64 bg-slate-200 rounded-2xl lg:col-span-2" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  )

  const p = profile || authUser
  const meta = ROLE_META[p?.role] || ROLE_META.sales
  const RoleIcon = meta.icon
  const displayForm = form || p

  return (
    <div className="space-y-6 animate-in max-w-5xl">

      {/* ── Hero header ───────────────────────────── */}
      <div className={`bg-gradient-to-br ${meta.color} rounded-3xl p-8 text-white relative overflow-hidden shadow-xl`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-40 h-40 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-12 w-32 h-32 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl font-extrabold text-white shadow-xl border-2 border-white/30">
              {p?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <RoleIcon size={14} className={meta.text} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold leading-tight truncate">{p?.full_name}</h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold border border-white/30">
                <RoleIcon size={11} /> {meta.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/80 text-sm">
              <span className="flex items-center gap-1.5"><Mail size={13} />{p?.email}</span>
              {p?.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{p.phone}</span>}
              {p?.department && <span className="flex items-center gap-1.5"><Briefcase size={13} />{p.department}</span>}
            </div>
            {p?.bio && <p className="mt-2 text-sm text-white/70 italic max-w-lg">{p.bio}</p>}
            <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
              <span className="flex items-center gap-1"><Calendar size={11} /> Member since {fmtDate(p?.created_at)}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${p?.is_active ? 'bg-white/20 text-white' : 'bg-red-500/30 text-red-200'}`}>
                <CheckCircle size={10} /> {p?.is_active ? 'Active account' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Edit toggle */}
          <button
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
            onClick={() => { setEditMode(e => !e); setForm(p) }}
          >
            {editMode ? <><X size={15} /> Cancel</> : <><Edit3 size={15} /> Edit Profile</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left col: Personal info + Password ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal info card */}
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 rounded-xl ${meta.bg} ${meta.text}`}><User size={16} /></div>
              <h2 className="font-bold text-slate-800">Personal Information</h2>
              {!editMode && <span className="ml-auto text-xs text-slate-400 italic">Click "Edit Profile" to update</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full Name</label>
                {editMode ? (
                  <input className="input" value={displayForm?.full_name || ''} onChange={set('full_name')} placeholder="Your full name" />
                ) : (
                  <div className="text-sm font-semibold text-slate-800 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100">{p?.full_name || '—'}</div>
                )}
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="text-sm font-semibold text-slate-500 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                  <Mail size={13} className="text-slate-400" />{p?.email}
                  <span className="ml-auto text-[10px] text-slate-400 font-normal">read-only</span>
                </div>
              </div>

              <div>
                <label className="label">Phone Number</label>
                {editMode ? (
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={displayForm?.phone || ''} onChange={set('phone')} placeholder="+91 98765 43210" />
                  </div>
                ) : (
                  <div className="text-sm py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
                    <Phone size={13} className="text-slate-400" />{p?.phone || <span className="text-slate-400 italic text-xs">Not set</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Department</label>
                {editMode ? (
                  <div className="relative">
                    <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={displayForm?.department || ''} onChange={set('department')} placeholder="e.g. Sales, Operations" />
                  </div>
                ) : (
                  <div className="text-sm py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
                    <Briefcase size={13} className="text-slate-400" />{p?.department || <span className="text-slate-400 italic text-xs">Not set</span>}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="label">Bio / About</label>
                {editMode ? (
                  <textarea
                    className="input resize-none"
                    rows={3}
                    value={displayForm?.bio || ''}
                    onChange={set('bio')}
                    placeholder="A short description about yourself and your role…"
                  />
                ) : (
                  <div className="text-sm py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[64px] text-slate-700">
                    {p?.bio || <span className="text-slate-400 italic text-xs">No bio added yet</span>}
                  </div>
                )}
              </div>
            </div>

            {editMode && (
              <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
                <button className="btn-primary" disabled={updateMut.isPending} onClick={handleSave}>
                  <Save size={15} /> {updateMut.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="btn-secondary" onClick={() => { setEditMode(false); setForm(p) }}>
                  <X size={15} /> Discard
                </button>
              </div>
            )}
          </div>

          {/* Password card */}
          <div className="card">
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setShowPwdSection(s => !s)}
            >
              <div className="p-2 rounded-xl bg-slate-100 text-slate-500"><KeyRound size={16} /></div>
              <div>
                <h2 className="font-bold text-slate-800">Security &amp; Password</h2>
                <p className="text-xs text-slate-400 mt-0.5">Change your account password</p>
              </div>
              <button className={`ml-auto p-2 rounded-xl transition-all ${showPwdSection ? 'bg-slate-100 rotate-180' : 'hover:bg-slate-50'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </div>

            {showPwdSection && (
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-4 animate-in">
                <div>
                  <label className="label">Current Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-9 pr-10"
                      type={showCurrent ? 'text' : 'password'}
                      value={pwdForm.current_password}
                      onChange={setPwd('current_password')}
                      placeholder="Your current password"
                    />
                    <button type="button" className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-600" onClick={() => setShowCurrent(v => !v)}>
                      {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-9 pr-10"
                      type={showNew ? 'text' : 'password'}
                      value={pwdForm.new_password}
                      onChange={setPwd('new_password')}
                      placeholder="Min. 6 characters"
                    />
                    <button type="button" className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-600" onClick={() => setShowNew(v => !v)}>
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {pwdForm.new_password && (
                    <div className="mt-1.5 flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          pwdForm.new_password.length >= i * 3
                            ? i <= 1 ? 'bg-rose-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-yellow-400' : 'bg-emerald-400'
                            : 'bg-slate-200'
                        }`} />
                      ))}
                      <span className="text-[10px] text-slate-400 ml-1">
                        {pwdForm.new_password.length < 3 ? 'Weak' : pwdForm.new_password.length < 6 ? 'Fair' : pwdForm.new_password.length < 9 ? 'Good' : 'Strong'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="input pl-9 pr-10"
                      type={showConfirm ? 'text' : 'password'}
                      value={pwdForm.confirm}
                      onChange={setPwd('confirm')}
                      placeholder="Repeat new password"
                    />
                    <button type="button" className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-600" onClick={() => setShowConfirm(v => !v)}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {pwdForm.confirm && pwdForm.new_password && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${pwdForm.confirm === pwdForm.new_password ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {pwdForm.confirm === pwdForm.new_password ? <><CheckCircle size={11} /> Passwords match</> : <><X size={11} /> Passwords do not match</>}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button className="btn-primary" disabled={pwdMut.isPending} onClick={handlePwdChange}>
                    <KeyRound size={15} /> {pwdMut.isPending ? 'Changing…' : 'Change Password'}
                  </button>
                  <button className="btn-secondary" onClick={() => { setShowPwdSection(false); setPwdForm({ current_password: '', new_password: '', confirm: '' }) }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right col: Role info ──────────────── */}
        <div className="space-y-5">

          {/* Role card */}
          <div className={`card border ${meta.border}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${meta.bg} ${meta.text}`}><RoleIcon size={18} /></div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{meta.label}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.text}`}>{p?.role}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
              <Info size={11} className="inline mr-1 text-slate-400" />
              {meta.desc}
            </p>
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Access Permissions</p>
              {meta.perms.map(perm => (
                <PermCard key={perm.label} {...perm} color={meta.text} border={meta.border} bg={meta.bg} />
              ))}
            </div>
          </div>

          {/* Account info card */}
          <div className="card">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-100"><Activity size={14} className="text-slate-500" /></div>
              Account Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Account Status</span>
                <span className={`font-bold flex items-center gap-1 ${p?.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle size={11} /> {p?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Role</span>
                <span className={`font-bold capitalize ${meta.text}`}>{p?.role}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Member Since</span>
                <span className="font-semibold text-slate-700">{fmtDate(p?.created_at)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">User ID</span>
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[100px]" title={p?.id}>{p?.id?.slice(0, 8)}…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
