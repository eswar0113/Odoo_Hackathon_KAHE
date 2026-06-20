import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, ShoppingCart, Truck,
  Factory, Users, Building2, LogOut, Menu, X, ClipboardList
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/sales', label: 'Sales', icon: ShoppingCart },
  { path: '/purchase', label: 'Purchase', icon: Truck },
  { path: '/manufacturing', label: 'Manufacturing', icon: Factory },
  { path: '/vendors', label: 'Vendors', icon: Building2 },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/audit', label: 'Audit Logs', icon: ClipboardList, adminOnly: true },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const visible = navItems.filter(item => !item.adminOnly || user?.role === 'admin')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform md:relative md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 h-16 px-6 border-b border-gray-200">
          <Factory className="text-blue-600" size={24} />
          <div>
            <div className="font-bold text-gray-900 text-sm">Shiv Furniture</div>
            <div className="text-xs text-gray-500">Mini ERP</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {visible.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-900">{user?.full_name}</div>
          <div className="text-xs text-gray-500 capitalize mb-3">{user?.role}</div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4">
          <button className="md:hidden" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <h1 className="text-lg font-semibold text-gray-900">
            {visible.find(i => i.path !== '/' && location.pathname.startsWith(i.path))?.label || 'Dashboard'}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
