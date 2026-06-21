import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, ShoppingCart, Truck,
  Factory, Users, Building2, LogOut, Menu, X,
  ClipboardList, ChevronRight, UserCog, User
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { path: '/',              label: 'Dashboard',       icon: LayoutDashboard, color: 'text-amber-400',   bg: 'bg-amber-500/20',   roles: ['admin','owner','sales','purchase','manufacturing','inventory'] },
  { path: '/products',      label: 'Products',        icon: Package,         color: 'text-amber-300',   bg: 'bg-amber-500/15',   roles: ['admin','owner','inventory','sales','purchase','manufacturing'] },
  { path: '/sales',         label: 'Sales',           icon: ShoppingCart,    color: 'text-emerald-400', bg: 'bg-emerald-500/20', roles: ['admin','owner','sales'] },
  { path: '/purchase',      label: 'Purchase',        icon: Truck,           color: 'text-blue-400',    bg: 'bg-blue-500/20',    roles: ['admin','owner','purchase'] },
  { path: '/manufacturing', label: 'Manufacturing',   icon: Factory,         color: 'text-orange-400',  bg: 'bg-orange-500/20',  roles: ['admin','owner','manufacturing'] },
  { path: '/vendors',       label: 'Vendors',         icon: Building2,       color: 'text-rose-400',    bg: 'bg-rose-500/20',    roles: ['admin','owner','purchase'] },
  { path: '/customers',     label: 'Customers',       icon: Users,           color: 'text-teal-400',    bg: 'bg-teal-500/20',    roles: ['admin','owner','sales'] },
  { path: '/audit',         label: 'Audit Logs',      icon: ClipboardList,   color: 'text-stone-400',   bg: 'bg-stone-500/20',   roles: ['admin','owner'] },
  { path: '/users',         label: 'User Management', icon: UserCog,         color: 'text-purple-400',  bg: 'bg-purple-500/20',  roles: ['admin'] },
]

const ROLE_COLORS = {
  admin:         'from-rose-600 to-rose-800',
  owner:         'from-amber-600 to-amber-800',
  sales:         'from-emerald-600 to-teal-700',
  purchase:      'from-blue-600 to-blue-800',
  manufacturing: 'from-orange-600 to-orange-800',
  inventory:     'from-teal-600 to-teal-800',
}

function UserAvatar({ name, role, size = 'md' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const color = ROLE_COLORS[role] || 'from-slate-500 to-slate-600'
  const sz = size === 'sm' ? 'w-8 h-8 text-xs rounded-lg' : 'w-10 h-10 text-sm rounded-xl'
  return (
    <div className={`${sz} bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md`}>
      {initials}
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

  const isProfile = location.pathname === '/profile'

  return (
    <div className="flex h-screen bg-stone-100 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-stone-950 flex flex-col
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-white/5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-950/60">
            <Factory size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Shiv Furniture</div>
            <div className="text-xs text-stone-400">Mini ERP</div>
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
                className={`nav-item group ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                <div className={`p-1.5 rounded-lg transition-colors duration-150 ${active ? bg : 'group-hover:bg-white/5'}`}>
                  <Icon size={16} className={active ? color : 'text-slate-500 group-hover:text-slate-300 transition-colors'} />
                </div>
                <span className={`transition-colors ${active ? 'text-white font-semibold' : 'group-hover:text-slate-200'}`}>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto text-white/40" />}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/5 flex-shrink-0 space-y-1">
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${isProfile ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <UserAvatar name={user?.full_name} role={user?.role} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{user?.full_name}</div>
              <div className="text-xs text-stone-400 capitalize">{user?.role}</div>
            </div>
            <User size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all px-3 py-2 rounded-xl"
          >
            <LogOut size={13} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-stone-950/75 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Main content ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-stone-200/60 flex items-center px-6 gap-4 flex-shrink-0 sticky top-0 z-30 shadow-sm">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-stone-100 active:scale-95 transition-all"
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X size={20} className="text-stone-600" /> : <Menu size={20} className="text-stone-600" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-400 font-medium">ERP</span>
            <ChevronRight size={14} className="text-stone-300" />
            <span className="font-semibold text-stone-800">
              {isProfile ? 'My Profile' : (currentPage?.label || 'Dashboard')}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Profile link in header */}
            <Link
              to="/profile"
              className="flex items-center gap-2.5 hover:bg-stone-50 px-3 py-1.5 rounded-xl transition-all group"
              title="My Profile"
            >
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">{user?.full_name}</div>
                <div className="text-xs text-stone-400 capitalize">{user?.role}</div>
              </div>
              <UserAvatar name={user?.full_name} role={user?.role} size="sm" />
            </Link>
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
