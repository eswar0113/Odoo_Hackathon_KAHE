import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, ShoppingCart, Truck,
  Factory, Users, Building2, LogOut, Menu, X,
  ClipboardList, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { path: '/',               label: 'Dashboard',      icon: LayoutDashboard, color: 'text-indigo-400',  bg: 'bg-indigo-500/20', roles: ['admin','owner','sales','purchase','manufacturing','inventory'] },
  { path: '/products',       label: 'Products',       icon: Package,         color: 'text-sky-400',     bg: 'bg-sky-500/20',    roles: ['admin','owner','inventory'] },
  { path: '/sales',          label: 'Sales',          icon: ShoppingCart,    color: 'text-emerald-400', bg: 'bg-emerald-500/20',roles: ['admin','owner','sales'] },
  { path: '/purchase',       label: 'Purchase',       icon: Truck,           color: 'text-violet-400',  bg: 'bg-violet-500/20', roles: ['admin','owner','purchase'] },
  { path: '/manufacturing',  label: 'Manufacturing',  icon: Factory,         color: 'text-amber-400',   bg: 'bg-amber-500/20',  roles: ['admin','owner','manufacturing'] },
  { path: '/vendors',        label: 'Vendors',        icon: Building2,       color: 'text-rose-400',    bg: 'bg-rose-500/20',   roles: ['admin','owner','purchase'] },
  { path: '/customers',      label: 'Customers',      icon: Users,           color: 'text-teal-400',    bg: 'bg-teal-500/20',   roles: ['admin','owner','sales'] },
  { path: '/audit',          label: 'Audit Logs',     icon: ClipboardList,   color: 'text-slate-400',   bg: 'bg-slate-500/20',  roles: ['admin'] },
]

function UserAvatar({ name, role }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const roleColors = {
    admin: 'bg-rose-500', owner: 'bg-violet-500', sales: 'bg-emerald-500',
    purchase: 'bg-blue-500', manufacturing: 'bg-amber-500', inventory: 'bg-teal-500',
  }
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${roleColors[role] || 'bg-slate-500'} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
        {initials}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">{name}</div>
        <div className="text-xs text-slate-400 capitalize">{role}</div>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const visible = navItems.filter(item => item.roles.includes(user?.role))

  const currentPage = visible.find(i =>
    i.path !== '/' ? location.pathname.startsWith(i.path) : location.pathname === '/'
  )

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-white/5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Factory size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Shiv Furniture</div>
            <div className="text-xs text-slate-400">Mini ERP</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {visible.map(({ path, label, icon: Icon, color, bg }) => {
            const active = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path)
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={`nav-item ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                <div className={`p-1.5 rounded-lg ${active ? bg : ''} transition-colors`}>
                  <Icon size={16} className={active ? color : 'text-slate-500'} />
                </div>
                <span className={active ? 'text-white font-semibold' : ''}>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto text-white/40" />}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <UserAvatar name={user?.full_name} role={user?.role} />
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors px-1 py-1"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Main content ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center px-6 gap-4 flex-shrink-0 sticky top-0 z-30">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} className="text-slate-600" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 font-medium">ERP</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="font-semibold text-slate-800">{currentPage?.label || 'Dashboard'}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-slate-800">{user?.full_name}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
