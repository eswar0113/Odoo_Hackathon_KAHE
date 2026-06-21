import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ShoppingCart, Truck, Factory, PackageCheck,
  TrendingUp, AlertTriangle, Clock, ArrowRight,
  Package, Zap, Building2, Users, ClipboardList,
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATUS_COLORS = {
  draft:               'bg-slate-100 text-slate-600',
  confirmed:           'bg-blue-100 text-blue-700',
  partially_delivered: 'bg-amber-100 text-amber-700',
  fully_delivered:     'bg-emerald-100 text-emerald-700',
  cancelled:           'bg-rose-100 text-rose-600',
  partially_received:  'bg-amber-100 text-amber-700',
  fully_received:      'bg-emerald-100 text-emerald-700',
  in_progress:         'bg-violet-100 text-violet-700',
  done:                'bg-emerald-100 text-emerald-700',
}

function PipelineCard({ title, icon: Icon, iconBg, total, stat1, stat2, segments, link }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all duration-200 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconBg} text-white shadow-sm`}>
            <Icon size={18} />
          </div>
          <span className="font-bold text-slate-800">{title}</span>
        </div>
        <Link to={link} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5 transition-colors">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="flex items-end gap-6">
        <div>
          <div className="text-4xl font-extrabold text-slate-900 tracking-tight tabular-nums">{total}</div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">total</div>
        </div>
        <div className="flex gap-5 pb-1">
          {stat1 && (
            <div>
              <div className={`text-2xl font-bold tabular-nums ${stat1.color}`}>{stat1.value}</div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{stat1.label}</div>
            </div>
          )}
          {stat2 && (
            <div>
              <div className={`text-2xl font-bold tabular-nums ${stat2.color}`}>{stat2.value}</div>
              <div className="text-[10px] text-slate-400 font-medium mt-0.5">{stat2.label}</div>
            </div>
          )}
        </div>
      </div>

      {total > 0 ? (
        <>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
            {segments.map((seg, i) => seg.value > 0 && (
              <div
                key={i}
                className={`h-full transition-all duration-700 ${seg.color} ${i > 0 ? 'ml-px' : ''}`}
                style={{ width: `${(seg.value / total) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 -mt-1">
            {segments.map((seg, i) => seg.value > 0 && (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${seg.dotColor}`} />
                <span className="text-[10px] text-slate-400">{seg.value} {seg.label}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="h-2 rounded-full bg-slate-100" />
      )}
    </div>
  )
}

function AlertCard({ count, label, icon: Icon, link, linkLabel, cls }) {
  if (!count || count === 0) return null
  return (
    <Link to={link} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md group ${cls}`}>
      <div className="p-2.5 bg-white/60 rounded-xl flex-shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-extrabold tabular-nums">{count}</div>
        <div className="text-xs font-semibold opacity-75 leading-tight">{label}</div>
      </div>
      <span className="text-xs font-semibold opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
        {linkLabel} <ArrowRight size={11} />
      </span>
    </Link>
  )
}

function QuickAction({ icon: Icon, label, to, color }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/40 hover:shadow-sm transition-all duration-150 group">
      <div className={`p-3 rounded-xl ${color} text-white shadow-sm group-hover:scale-110 transition-transform duration-150`}>
        <Icon size={18} />
      </div>
      <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-700 text-center transition-colors leading-tight">{label}</span>
    </Link>
  )
}

const QUICK_ACTIONS = {
  admin: [
    { icon: Package,      label: 'Products',     to: '/products',      color: 'bg-sky-600' },
    { icon: ShoppingCart, label: 'Sales',         to: '/sales',         color: 'bg-indigo-600' },
    { icon: Truck,        label: 'Purchase',      to: '/purchase',      color: 'bg-violet-600' },
    { icon: Factory,      label: 'Manufacturing', to: '/manufacturing', color: 'bg-amber-600' },
    { icon: Building2,    label: 'Vendors',       to: '/vendors',       color: 'bg-rose-600' },
    { icon: ClipboardList,label: 'Audit Logs',    to: '/audit',         color: 'bg-slate-600' },
  ],
  owner: [
    { icon: Package,      label: 'Products',     to: '/products',      color: 'bg-sky-600' },
    { icon: ShoppingCart, label: 'Sales',         to: '/sales',         color: 'bg-indigo-600' },
    { icon: Truck,        label: 'Purchase',      to: '/purchase',      color: 'bg-violet-600' },
    { icon: Factory,      label: 'Manufacturing', to: '/manufacturing', color: 'bg-amber-600' },
    { icon: Users,        label: 'Customers',     to: '/customers',     color: 'bg-teal-600' },
    { icon: Building2,    label: 'Vendors',       to: '/vendors',       color: 'bg-rose-600' },
  ],
  sales: [
    { icon: ShoppingCart, label: 'Sales Orders', to: '/sales',     color: 'bg-indigo-600' },
    { icon: Users,        label: 'Customers',    to: '/customers', color: 'bg-teal-600' },
    { icon: Package,      label: 'Products',     to: '/products',  color: 'bg-sky-600' },
  ],
  purchase: [
    { icon: Truck,     label: 'Purchase Orders', to: '/purchase', color: 'bg-violet-600' },
    { icon: Building2, label: 'Vendors',         to: '/vendors',  color: 'bg-rose-600' },
    { icon: Package,   label: 'Products',        to: '/products', color: 'bg-sky-600' },
  ],
  manufacturing: [
    { icon: Factory, label: 'Manufacturing', to: '/manufacturing', color: 'bg-amber-600' },
    { icon: Package, label: 'Products',      to: '/products',      color: 'bg-sky-600' },
  ],
  inventory: [
    { icon: Package, label: 'Products & Stock', to: '/products', color: 'bg-sky-600' },
  ],
}

function RecentOrders({ title, icon: Icon, iconColor, rows, linkBase, emptyMsg }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div className="flex items-center gap-2.5">
          <Icon size={15} className={iconColor} />
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        </div>
        <Link to={linkBase} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold flex items-center gap-0.5 transition-colors">
          All <ArrowRight size={11} />
        </Link>
      </div>
      {!rows?.length ? (
        <div className="px-5 py-10 text-center text-sm text-slate-400">{emptyMsg}</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {rows.map((row, i) => (
            <Link
              key={row.id}
              to={`${linkBase}/${row.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-400">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{row.name}</div>
                <div className="text-xs text-slate-400 truncate">{row.sub}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {row.date && (
                  <span className="text-[10px] text-slate-400">
                    {new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[row.status] || 'bg-slate-100 text-slate-600'}`}>
                  {row.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  })

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-slate-200 animate-pulse rounded-2xl w-2/5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-slate-200 animate-pulse rounded-2xl" />)}
        </div>
      </div>
    )
  }

  const soTotal   = data?.total_sales_orders ?? 0
  const soPending = data?.pending_deliveries ?? 0
  const soDelayed = data?.delayed_orders ?? 0
  const soPureP   = Math.max(0, soPending - soDelayed)
  const soDone    = Math.max(0, soTotal - soPending)

  const poTotal   = data?.total_purchase_orders ?? 0
  const poPartial = data?.partial_receipts ?? 0
  const poOther   = Math.max(0, poTotal - poPartial)

  const moTotal      = data?.total_manufacturing_orders ?? 0
  const moInProgress = data?.in_progress_mos ?? 0
  const moDone       = data?.done_mos ?? 0
  const moPending    = Math.max(0, moTotal - moInProgress - moDone)
  const moCompPct    = moTotal > 0 ? Math.round((moDone / moTotal) * 100) : 0

  const lowStock  = data?.low_stock_products ?? 0
  const hasAlerts = soDelayed > 0 || lowStock > 0 || poPartial > 0

  const recentSOs = data?.recent_sales_orders?.map(o => ({ id: o.id, name: o.name, sub: o.customer_name || '—', status: o.status, date: o.order_date })) || []
  const recentPOs = data?.recent_purchase_orders?.map(o => ({ id: o.id, name: o.name, sub: o.vendor_name || '—', status: o.status, date: o.order_date })) || []
  const recentMOs = data?.recent_manufacturing_orders?.map(o => ({ id: o.id, name: o.name, sub: o.product_name || '—', status: o.status, date: o.scheduled_date })) || []

  const quickActions = QUICK_ACTIONS[user?.role] || QUICK_ACTIONS.inventory

  return (
    <div className="space-y-7 animate-in">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{todayStr}</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting},{' '}
            <span className="text-indigo-600">{user?.full_name?.split(' ')[0] || 'there'}</span>!
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            <span className="font-semibold text-slate-600">Shiv Furniture Works</span>
            {user?.role && <> · <span className="capitalize">{user.role}</span> view</>}
          </p>
        </div>
        {hasAlerts && (
          <div className="flex flex-wrap gap-2 md:justify-end mt-1">
            {soDelayed > 0 && (
              <Link to="/sales" className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors pulse-ring">
                <Clock size={12} /> {soDelayed} delayed order{soDelayed !== 1 ? 's' : ''}
              </Link>
            )}
            {lowStock > 0 && (
              <Link to="/products" className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors">
                <AlertTriangle size={12} /> {lowStock} low stock
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Alert action cards ── */}
      {hasAlerts && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in-delay-1">
          <AlertCard
            count={soDelayed}
            label="sales orders past due date"
            icon={Clock}
            link="/sales"
            linkLabel="Review"
            cls="bg-rose-50 border-rose-200 text-rose-700"
          />
          <AlertCard
            count={lowStock}
            label="products below reorder point"
            icon={AlertTriangle}
            link="/products"
            linkLabel="View"
            cls="bg-amber-50 border-amber-200 text-amber-700"
          />
          <AlertCard
            count={poPartial}
            label="purchase orders partially received"
            icon={PackageCheck}
            link="/purchase"
            linkLabel="Follow up"
            cls="bg-violet-50 border-violet-200 text-violet-700"
          />
        </div>
      )}

      {/* ── Pipeline cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in-delay-2">
        <PipelineCard
          title="Sales Pipeline"
          icon={ShoppingCart}
          iconBg="bg-indigo-600"
          total={soTotal}
          stat1={{ value: soPending, label: 'pending delivery', color: soPending > 0 ? 'text-amber-500' : 'text-slate-400' }}
          stat2={{ value: soDelayed, label: 'delayed',          color: soDelayed > 0 ? 'text-rose-500' : 'text-slate-400' }}
          segments={[
            { value: soDone,    label: 'fulfilled', color: 'bg-emerald-400', dotColor: 'bg-emerald-400' },
            { value: soPureP,   label: 'pending',   color: 'bg-amber-400',   dotColor: 'bg-amber-400' },
            { value: soDelayed, label: 'delayed',   color: 'bg-rose-500',    dotColor: 'bg-rose-500' },
          ]}
          link="/sales"
        />
        <PipelineCard
          title="Purchase Pipeline"
          icon={Truck}
          iconBg="bg-violet-600"
          total={poTotal}
          stat1={{ value: poPartial, label: 'partially received', color: poPartial > 0 ? 'text-amber-500' : 'text-slate-400' }}
          stat2={{ value: poOther,   label: 'other',              color: 'text-slate-400' }}
          segments={[
            { value: poOther,   label: 'confirmed / received', color: 'bg-emerald-400', dotColor: 'bg-emerald-400' },
            { value: poPartial, label: 'partial',              color: 'bg-amber-400',   dotColor: 'bg-amber-400' },
          ]}
          link="/purchase"
        />
        <PipelineCard
          title="Manufacturing"
          icon={Factory}
          iconBg="bg-amber-600"
          total={moTotal}
          stat1={{ value: moInProgress, label: 'in progress',          color: moInProgress > 0 ? 'text-violet-500' : 'text-slate-400' }}
          stat2={{ value: moDone,       label: `done · ${moCompPct}%`, color: moDone > 0 ? 'text-emerald-500' : 'text-slate-400' }}
          segments={[
            { value: moDone,       label: 'done',        color: 'bg-emerald-400', dotColor: 'bg-emerald-400' },
            { value: moInProgress, label: 'in progress', color: 'bg-violet-400',  dotColor: 'bg-violet-400' },
            { value: moPending,    label: 'queued',      color: 'bg-slate-200',   dotColor: 'bg-slate-300' },
          ]}
          link="/manufacturing"
        />
      </div>

      {/* ── Quick navigation ── */}
      <div className="animate-in-delay-3">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={13} className="text-indigo-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Navigation</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(a => <QuickAction key={a.to + a.label} {...a} />)}
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="animate-in-delay-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={13} className="text-indigo-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Activity</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <RecentOrders title="Sales Orders"         icon={ShoppingCart} iconColor="text-indigo-500"
            rows={recentSOs} linkBase="/sales"         emptyMsg="No sales orders yet." />
          <RecentOrders title="Purchase Orders"      icon={Truck}        iconColor="text-violet-500"
            rows={recentPOs} linkBase="/purchase"      emptyMsg="No purchase orders yet." />
          <RecentOrders title="Manufacturing Orders" icon={Factory}      iconColor="text-amber-500"
            rows={recentMOs} linkBase="/manufacturing" emptyMsg="No manufacturing orders yet." />
        </div>
      </div>

    </div>
  )
}
