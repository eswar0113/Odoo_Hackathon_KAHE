import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Truck, Factory, PackageCheck, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../api/client'

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  </div>
)

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  })

  if (isLoading) return <div className="text-gray-500">Loading…</div>

  const stats = [
    { label: 'Total Sales Orders', value: data?.total_sales_orders ?? 0, icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Pending Deliveries', value: data?.pending_deliveries ?? 0, icon: AlertCircle, color: 'bg-orange-500' },
    { label: 'Total Purchase Orders', value: data?.total_purchase_orders ?? 0, icon: Truck, color: 'bg-purple-500' },
    { label: 'Partial Receipts', value: data?.partial_receipts ?? 0, icon: PackageCheck, color: 'bg-yellow-500' },
    { label: 'Manufacturing Orders', value: data?.total_manufacturing_orders ?? 0, icon: Factory, color: 'bg-indigo-500' },
    { label: 'MOs In Progress', value: data?.in_progress_mos ?? 0, icon: Factory, color: 'bg-pink-500' },
    { label: 'Completed MOs', value: data?.done_mos ?? 0, icon: CheckCircle, color: 'bg-green-500' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
    </div>
  )
}
