import { useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FurnitureScene from '../components/FurnitureScene'
import { Factory, Eye, EyeOff, ArrowRight, Package, ShoppingCart, Truck, Mail, Lock, AlertCircle } from 'lucide-react'

const FEATURES = [
  { icon: ShoppingCart, label: 'Sales & Delivery' },
  { icon: Truck,        label: 'Purchase & Receipts' },
  { icon: Factory,      label: 'Manufacturing Orders' },
  { icon: Package,      label: 'Inventory & Stock' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  /* panel mouse tracking for the 3-D furniture tilt */
  const [panelMouse, setPanelMouse] = useState({ x: 0.5, y: 0.5 })
  const onPanelMove  = useCallback((e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
    setPanelMouse({ x: (e.clientX - left) / width, y: (e.clientY - top) / height })
  }, [])
  const onPanelLeave = useCallback(() => setPanelMouse({ x: 0.5, y: 0.5 }), [])

  const tiltX = (panelMouse.y - 0.5) * -9
  const tiltY = (panelMouse.x - 0.5) * 11

  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Brand + 3-D Furniture Panel ─────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-stone-950 via-[#1A0C02] to-stone-950
                   flex-col justify-between p-12 relative overflow-hidden"
        onMouseMove={onPanelMove}
        onMouseLeave={onPanelLeave}
      >
        {/* 3-D interactive furniture illustration (absolute background) */}
        <FurnitureScene tiltX={tiltX} tiltY={tiltY} showBadges />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-900
                          flex items-center justify-center shadow-xl">
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
            <span className="text-amber-400">all in one place.</span>
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Replace spreadsheets and WhatsApp with a unified ERP that keeps your entire operation in sync.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label}
                className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <Icon size={16} className="text-amber-400 flex-shrink-0" />
                <span className="text-slate-300 text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-600">
          © 2024 Shiv Furniture Works · KAHE Hackathon
        </div>
      </div>

      {/* ── Right: Form Panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-slate-50">
        <div className="w-full max-w-sm animate-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center">
              <Factory size={18} className="text-white" />
            </div>
            <span className="font-bold text-slate-800">Shiv Furniture Works</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your ERP account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  className="input pl-9"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@shivfurniture.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  className="input pl-9 pr-10"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
              {loading ? 'Signing in…' : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-rose-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-amber-700 font-semibold hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
