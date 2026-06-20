import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Factory, Eye, EyeOff, ArrowRight, Package, ShoppingCart, Truck } from 'lucide-react'

const FEATURES = [
  { icon: ShoppingCart, label: 'Sales & Delivery' },
  { icon: Truck,        label: 'Purchase & Receipts' },
  { icon: Factory,      label: 'Manufacturing Orders' },
  { icon: Package,      label: 'Inventory & Stock' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('admin@shivfurniture.com')
  const [password, setPassword] = useState('admin123')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Brand Panel ──────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-xl">
            <Factory size={22} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-lg leading-tight">Shiv Furniture Works</div>
            <div className="text-indigo-300 text-xs">Mini ERP Platform</div>
          </div>
        </div>

        {/* Copy */}
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold text-white leading-snug mb-4">
            From demand<br />to delivery,<br />
            <span className="text-indigo-400">all in one place.</span>
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Replace spreadsheets and WhatsApp with a unified ERP that keeps your entire operation in sync.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <Icon size={16} className="text-indigo-400 flex-shrink-0" />
                <span className="text-slate-300 text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-600">
          © 2024 Shiv Furniture Works · KAHE Hackathon
        </div>
      </div>

      {/* ── Right: Form Panel ──────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50">
        <div className="w-full max-w-sm animate-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Factory size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-800">Shiv Furniture Works</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your ERP account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input
                id="login-email"
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@shivfurniture.com"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  className="input pr-10"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? 'Signing in…' : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
