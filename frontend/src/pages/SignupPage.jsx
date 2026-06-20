import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { Factory, User, Mail, Lock, Briefcase, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react'

const ROLES = [
  { value: 'sales',         label: 'Sales',          desc: 'Manage orders & deliveries' },
  { value: 'purchase',      label: 'Purchase',       desc: 'Vendors & purchase orders' },
  { value: 'manufacturing', label: 'Manufacturing',  desc: 'Production & BoMs' },
  { value: 'inventory',     label: 'Inventory',      desc: 'Stock & movements' },
  { value: 'admin',         label: 'Admin',          desc: 'Full access + audit logs' },
  { value: 'owner',         label: 'Owner',          desc: 'Business owner view' },
]

export default function SignupPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirmPassword: '', role: 'sales',
  })
  const [showPwd, setShowPwd]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await api.post('/auth/register', {
        full_name: form.full_name, email: form.email, password: form.password, role: form.role,
      })
      await login(form.email, form.password)
      toast.success(`Welcome aboard, ${form.full_name}! 🎉`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Brand Panel ──────────────────── */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-40 -right-20 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl">
            <Factory size={22} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg">Shiv Furniture Works</div>
            <div className="text-indigo-300 text-xs">Mini ERP Platform</div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-violet-400" />
            <span className="text-violet-300 text-sm font-medium">New Account</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-snug mb-3">
            Join your team<br />on the ERP.
          </h2>
          <p className="text-slate-400 text-sm">
            Pick your role below and get started in seconds. All data is synced in real-time across the team.
          </p>
        </div>

        {/* Role pills */}
        <div className="relative z-10 space-y-2">
          {ROLES.map(r => (
            <div
              key={r.value}
              onClick={() => setForm(f => ({ ...f, role: r.value }))}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150
                ${form.role === r.value
                  ? 'bg-white/10 border-white/20 shadow-lg'
                  : 'bg-white/[0.03] border-white/5 hover:bg-white/5'}`}
            >
              <Briefcase size={14} className={form.role === r.value ? 'text-violet-300' : 'text-slate-500'} />
              <div>
                <div className={`text-sm font-semibold ${form.role === r.value ? 'text-white' : 'text-slate-400'}`}>{r.label}</div>
                <div className="text-xs text-slate-600">{r.desc}</div>
              </div>
              {form.role === r.value && (
                <div className="ml-auto w-2 h-2 rounded-full bg-violet-400" />
              )}
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-slate-700">
          © 2024 Shiv Furniture Works
        </div>
      </div>

      {/* ── Right: Form ────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-sm animate-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Factory size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-800">Shiv Furniture Works</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
          <p className="text-slate-500 text-sm mb-8">Get access to the ERP in seconds</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="signup-full-name" className="input pl-9" type="text" placeholder="Raj Kumar"
                  value={form.full_name} onChange={set('full_name')} required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="signup-email" className="input pl-9" type="email" placeholder="you@shivfurniture.com"
                  value={form.email} onChange={set('email')} required />
              </div>
            </div>

            {/* Role — desktop only select, left panel is interactive on desktop */}
            <div className="lg:hidden">
              <label className="label">Role</label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select id="signup-role" className="input pl-9 appearance-none bg-white"
                  value={form.role} onChange={set('role')}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="signup-password" className="input pl-9 pr-10" type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="signup-confirm-password" className="input pl-9 pr-10" type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button id="signup-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? 'Creating account…' : (<>Create Account <ArrowRight size={16} /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
