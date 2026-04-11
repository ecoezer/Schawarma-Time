import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Settings,
  LogOut, Menu, X, Bell, Tag, Users, ChevronLeft, XCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useOrderStore } from '@/store/orderStore'
import toast from 'react-hot-toast'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/bestellungen', label: 'Bestellungen', icon: ShoppingBag },
  { path: '/admin/menue', label: 'Menü verwalten', icon: UtensilsCrossed },
  { path: '/admin/kampagnen', label: 'Kampagnen', icon: Tag },
  { path: '/admin/kunden', label: 'Kunden', icon: Users },
  { path: '/admin/einstellungen', label: 'Einstellungen', icon: Settings },
]

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const user = useAuthStore(state => state.user)
  const { signOut } = useAuthStore()
  const { fetchOrders, initRealtime } = useOrderStore()

  useEffect(() => {
    fetchOrders()
    const unsubOrders = initRealtime((order) => {
      toast.success(`Neue Bestellung: ${order.order_number}`)
    })
    return unsubOrders
  }, [fetchOrders, initRealtime])

  const handleLogout = async () => {
    await signOut()
    toast.success('Erfolgreich abgemeldet')
    window.location.href = '/admin/login'
  }

  // Use centralized orderStore for pending count
  const pendingCount = useOrderStore(state => state.orders.filter(o => o.status === 'pending').length)

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#142328] text-white flex flex-col transition-transform duration-300 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
              <span className="text-[#142328] font-black text-sm">S47</span>
            </div>
            <div>
              <p className="font-black text-sm leading-tight">Smash47</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-white/10 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path, item.exact)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-gray-400 hover:bg-white/8 hover:text-white'
                )}
              >
                <item.icon size={18} />
                {item.label}
                {item.path === '/admin/bestellungen' && pendingCount > 0 && (
                  <span className="ml-auto bg-[#06c167] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-white/10 pt-3">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/8 transition-all mb-1"
          >
            <ShoppingBag size={18} />
            Zur Website
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut size={18} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#06c167] rounded-full" />
          </button>
          <div className="w-8 h-8 bg-[#142328] rounded-full flex items-center justify-center text-white text-sm font-bold">
            {user?.full_name?.charAt(0) || 'A'}
          </div>
        </header>

        {/* Diagnostic Panel — only in development */}
        {import.meta.env.DEV && (
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-2 flex items-center justify-between text-[10px] text-blue-600 font-mono">
            <div className="flex gap-4">
              <span>UID: {user?.id?.slice(0, 8)}...</span>
              <span className="font-bold bg-blue-100 px-1.5 py-0.5 rounded uppercase">Role: {user?.role}</span>
            </div>
            <div className="flex gap-2">
              <span>DB: {import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0]}</span>
              <span className={`w-2 h-2 rounded-full self-center ${user ? 'bg-green-500' : 'bg-red-400'}`}></span>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
