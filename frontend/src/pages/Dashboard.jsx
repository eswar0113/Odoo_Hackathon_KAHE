import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Truck, Factory, PackageCheck, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const StatCard = ({ label, value, icon: Icon, color, description }) => (
  <div className="stat-card flex flex-col justify-between h-36 relative overflow-hidden animate-in">
    <div className="flex justify-between items-start">
      <div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">{label}</span>
        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</span>
      </div>
      <div className={`p-3 rounded-2xl ${color} text-white shadow-lg shadow-indigo-100 flex-shrink-0`}>
        <Icon size={22} />
      </div>
    </div>
    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mt-4 border-t border-slate-50 pt-3">
      <TrendingUp size={14} className="text-emerald-500" />
      <span>{description || 'Real-time updates'}</span>
    </div>
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-slate-200 animate-pulse rounded-2xl w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-200 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Sales Orders', value: data?.total_sales_orders ?? 0, icon: ShoppingCart, color: 'bg-gradient-to-br from-indigo-500 to-indigo-600', description: 'Customer sales orders logged' },
    { label: 'Pending Deliveries', value: data?.pending_deliveries ?? 0, icon: AlertCircle, color: 'bg-gradient-to-br from-orange-400 to-amber-500', description: 'Orders awaiting delivery' },
    { label: 'Total Purchase Orders', value: data?.total_purchase_orders ?? 0, icon: Truck, color: 'bg-gradient-to-br from-violet-500 to-fuchsia-600', description: 'Vendor procurements created' },
    { label: 'Partial Receipts', value: data?.partial_receipts ?? 0, icon: PackageCheck, color: 'bg-gradient-to-br from-yellow-400 to-amber-500', description: 'Shipments received partially' },
    { label: 'Manufacturing Orders', value: data?.total_manufacturing_orders ?? 0, icon: Factory, color: 'bg-gradient-to-br from-blue-500 to-indigo-600', description: 'Production jobs registered' },
    { label: 'MOs In Progress', value: data?.in_progress_mos ?? 0, icon: Factory, color: 'bg-gradient-to-br from-pink-500 to-rose-500', description: 'Currently on assembly floor' },
    { label: 'Completed MOs', value: data?.done_mos ?? 0, icon: CheckCircle, color: 'bg-gradient-to-br from-emerald-400 to-teal-500', description: 'Fully manufactured items' },
  ]

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{user?.name || 'Administrator'}</span>!
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here is a quick overview of Shiv Furniture Works for today, {today}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Decorative Brand Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-slate-200 mt-8">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">ERP Overview</span>
          <h3 className="text-2xl font-bold">Integrated Manufacturing & Inventory Control</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Manage your materials, track supplier operations, coordinate assembly floor statuses, and audit activity history all in one place. Navigate via the sidebar to get started.
          </p>
        </div>
      </div>
    </div>
  )
}
