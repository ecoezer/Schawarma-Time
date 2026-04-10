import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, Users, Euro, Clock, AlertCircle, CheckCircle, Truck } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Toggle } from '@/components/ui/Toggle'
import { supabase } from '@/lib/supabase'
import { useRestaurantStore } from '@/store/restaurantStore'
import { formatPrice, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Order } from '@/types'

export function AdminDashboard() {
  const { settings, toggleDelivery } = useRestaurantStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [revenueData, setRevenueData] = useState<{ day: string; revenue: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const DAY_LABELS: Record<number, string> = { 0: 'So', 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa' }

  useEffect(() => {
    fetchDashboardData()

    // Real-time for new orders
    const channel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Today's range
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // Fetch today's orders
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', todayStart.toISOString())
        .order('created_at', { ascending: false })

      setOrders((todayOrders || []) as Order[])

      // Fetch total customer count
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
      setTotalCustomers(count || 0)

      // Fetch last 7 days orders for chart
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const { data: weekOrders } = await supabase
        .from('orders')
        .select('created_at, total, status')
        .gte('created_at', sevenDaysAgo.toISOString())
        .neq('status', 'cancelled')

      // Group by day
      const revenueMap: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        revenueMap[DAY_LABELS[d.getDay()]] = 0
      }

      ;(weekOrders || []).forEach((o) => {
        const day = DAY_LABELS[new Date(o.created_at).getDay()]
        if (day in revenueMap) {
          revenueMap[day] = (revenueMap[day] || 0) + (o.total || 0)
        }
      })

      setRevenueData(Object.entries(revenueMap).map(([day, revenue]) => ({ day, revenue })))
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    }
    setIsLoading(false)
  }

  const activeOrders = orders.filter((o) => !['cancelled', 'delivered'].includes(o.status))
  const todayRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0)
  const avgOrderValue = orders.length > 0 ? todayRevenue / orders.filter((o) => o.status !== 'cancelled').length : 0
  const goal = settings?.revenue_goal_daily || 500

  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const preparingCount = orders.filter((o) => o.status === 'preparing' || o.status === 'confirmed').length
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length

  const recentOrders = orders.slice(0, 4)

  const stats = [
    { label: 'Heutige Einnahmen', value: formatPrice(todayRevenue), icon: Euro, color: 'bg-green-50 text-green-600', change: `${orders.filter(o => o.status !== 'cancelled').length} Bestellungen` },
    { label: 'Bestellungen heute', value: orders.length.toString(), icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', change: `${activeOrders.length} aktiv` },
    { label: 'Kunden gesamt', value: totalCustomers.toString(), icon: Users, color: 'bg-purple-50 text-purple-600', change: 'Registriert' },
    { label: 'Ø Bestellwert', value: isNaN(avgOrderValue) ? '—' : formatPrice(avgOrderValue), icon: TrendingUp, color: 'bg-orange-50 text-orange-600', change: 'Heute' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Guten Tag! Hier ist die Übersicht von heute.</p>
        </div>

        {/* Delivery Toggle – connected to Supabase via restaurantStore */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <Truck size={18} className={settings?.is_delivery_active ? 'text-[#06c167]' : 'text-gray-400'} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Lieferung</p>
            <p className="text-xs text-gray-500">{settings?.is_delivery_active ? 'Aktiv' : 'Inaktiv'}</p>
          </div>
          <Toggle
            checked={!!settings?.is_delivery_active}
            onChange={toggleDelivery}
            size="md"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            {isLoading ? (
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-[#142328] font-semibold mt-1">{stat.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Goal */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Tagesziel</h2>
          <span className="text-sm text-gray-500">{formatPrice(todayRevenue)} / {formatPrice(goal)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#06c167] to-[#142328] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((todayRevenue / goal) * 100, 100)}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {Math.round((todayRevenue / goal) * 100)}% des Tagesziels erreicht
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">Einnahmen diese Woche</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#142328" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#142328" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(v) => [`€${Number(v).toFixed(2)}`, 'Einnahmen']} />
              <Area type="monotone" dataKey="revenue" stroke="#142328" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Letzte Bestellungen</h2>
            <a href="/admin/bestellungen" className="text-xs text-[#06c167] font-semibold hover:underline">Alle ansehen</a>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Bestellungen heute</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-9 h-9 bg-[#142328] rounded-xl flex items-center justify-center text-white shrink-0">
                    <ShoppingBag size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{order.items.length} Artikel · {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ausstehend', count: pendingCount, icon: AlertCircle, color: 'text-yellow-500 bg-yellow-50' },
          { label: 'In Zubereitung', count: preparingCount, icon: Clock, color: 'text-orange-500 bg-orange-50' },
          { label: 'Geliefert heute', count: deliveredCount, icon: CheckCircle, color: 'text-green-500 bg-green-50' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${item.color}`}>
              <item.icon size={20} />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mx-auto mb-1" />
            ) : (
              <p className="text-2xl font-black text-gray-900">{item.count}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
