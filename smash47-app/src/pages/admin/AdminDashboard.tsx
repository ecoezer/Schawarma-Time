import { useState } from 'react'
import { TrendingUp, ShoppingBag, Users, Euro, Clock, AlertCircle, CheckCircle, Truck } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Toggle } from '@/components/ui/Toggle'
import { mockRestaurantSettings } from '@/data/mockData'
import { formatPrice, getStatusColor, getStatusLabel } from '@/lib/utils'

const revenueData = [
  { day: 'Mo', revenue: 320 }, { day: 'Di', revenue: 410 }, { day: 'Mi', revenue: 280 },
  { day: 'Do', revenue: 540 }, { day: 'Fr', revenue: 620 }, { day: 'Sa', revenue: 780 },
  { day: 'So', revenue: 450 },
]

const recentOrders = [
  { id: 'S47-ABC1', customer: 'Max Mustermann', total: 18.50, status: 'preparing', items: 3, time: '14:32' },
  { id: 'S47-ABC2', customer: 'Anna Schmidt', total: 24.90, status: 'on_the_way', items: 4, time: '14:15' },
  { id: 'S47-ABC3', customer: 'Tom Müller', total: 12.00, status: 'pending', items: 2, time: '14:45' },
  { id: 'S47-ABC4', customer: 'Lisa Weber', total: 31.50, status: 'delivered', items: 5, time: '13:55' },
]

export function AdminDashboard() {
  const [deliveryActive, setDeliveryActive] = useState(mockRestaurantSettings.is_delivery_active)
  const goal = mockRestaurantSettings.revenue_goal_daily
  const todayRevenue = 412

  const stats = [
    { label: 'Heutige Einnahmen', value: formatPrice(todayRevenue), icon: Euro, color: 'bg-green-50 text-green-600', change: '+12%' },
    { label: 'Bestellungen heute', value: '24', icon: ShoppingBag, color: 'bg-blue-50 text-blue-600', change: '+4' },
    { label: 'Aktive Kunden', value: '18', icon: Users, color: 'bg-purple-50 text-purple-600', change: 'Aktuell' },
    { label: 'Ø Bestellwert', value: formatPrice(17.20), icon: TrendingUp, color: 'bg-orange-50 text-orange-600', change: '+€1.30' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Guten Tag! Hier ist die Übersicht von heute.</p>
        </div>

        {/* Delivery Toggle */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <Truck size={18} className={deliveryActive ? 'text-[#06c167]' : 'text-gray-400'} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Lieferung</p>
            <p className="text-xs text-gray-500">{deliveryActive ? 'Aktiv' : 'Inaktiv'}</p>
          </div>
          <Toggle
            checked={deliveryActive}
            onChange={setDeliveryActive}
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
            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            <p className="text-xs text-green-600 font-semibold mt-1">{stat.change}</p>
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
              <Tooltip formatter={(v) => [`€${v}`, 'Einnahmen']} />
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
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-[#142328] rounded-xl flex items-center justify-center text-white shrink-0">
                  <ShoppingBag size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{order.customer}</p>
                  <p className="text-xs text-gray-500">{order.items} Artikel · {order.time} Uhr</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatPrice(order.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ausstehend', count: 3, icon: AlertCircle, color: 'text-yellow-500 bg-yellow-50' },
          { label: 'In Zubereitung', count: 5, icon: Clock, color: 'text-orange-500 bg-orange-50' },
          { label: 'Geliefert heute', count: 16, icon: CheckCircle, color: 'text-green-500 bg-green-50' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${item.color}`}>
              <item.icon size={20} />
            </div>
            <p className="text-2xl font-black text-gray-900">{item.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
