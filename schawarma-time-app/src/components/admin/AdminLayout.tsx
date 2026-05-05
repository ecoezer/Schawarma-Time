import { useState, useEffect, useRef, useMemo } from 'react'
import { Capacitor } from '@capacitor/core'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Settings,
  LogOut, Menu, X, Bell, Tag, Users, Lock, Eye, EyeOff
} from 'lucide-react'
import logo from '@/assets/logo.png'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useOrderStore } from '@/store/orderStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { supabase } from '@/lib/supabase'
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [showPwModal, setShowPwModal] = useState(false)
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState({ new: false, confirm: false })
  const [isSavingPw, setIsSavingPw] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword.length < 10) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Passwort muss mindestens 10 Zeichen lang sein.
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Passwörter stimmen nicht überein.
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return
    }
    setIsSavingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword })
      if (error) throw error
      toast.success('Passwort erfolgreich geändert!')
      setShowPwModal(false)
      setPwForm({ newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          {err.message ?? 'Fehler beim Ändern des Passworts.'}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsSavingPw(false)
    }
  }

  const user = useAuthStore(state => state.user)
  const { signOut } = useAuthStore()
  const { fetchOrders, initRealtime } = useOrderStore()
  const { fetchSettings } = useRestaurantStore()

  useEffect(() => {
    fetchOrders()
    // Admin layout uses full settings (delivery_zones + revenue_goal_daily visible)
    fetchSettings(true)
    const unsubOrders = initRealtime((order) => {
      toast.success(`Neue Bestellung: ${order.order_number}`)
    })
    return unsubOrders
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await signOut()
    toast.success('Erfolgreich abgemeldet')
    window.location.href = '/admin/login'
  }

  const allOrders = useOrderStore(state => state.orders)
  const pendingOrders = useMemo(() => allOrders.filter(o => o.status === 'pending'), [allOrders])
  const pendingCount = pendingOrders.length

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
            <img src={logo} alt="Schawarma-Time" className="h-10 w-auto object-contain bg-white rounded-lg p-1" />
            <div>
              <p className="font-black text-sm leading-tight">Schawarma-Time</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Admin Panel</p>
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
        <header className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <Menu size={20} />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-7 w-auto bg-white rounded p-0.5" />
              <span className="font-black text-xs text-[#142328] uppercase tracking-tight">Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Bell — pending orders dropdown */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => { setBellOpen(v => !v); setProfileOpen(false) }}
                className={cn(
                  "relative p-2 rounded-lg transition-all",
                  pendingCount > 0 ? "bg-yellow-50 text-yellow-600 ring-2 ring-yellow-400/20" : "hover:bg-gray-100 text-gray-500"
                )}
              >
                <motion.div
                  animate={pendingCount > 0 ? {
                    rotate: [0, -20, 20, -20, 20, 0],
                  } : { rotate: 0 }}
                  transition={pendingCount > 0 ? {
                    repeat: Infinity,
                    duration: 0.5,
                    ease: "easeInOut"
                  } : {}}
                >
                  <Bell size={20} fill={pendingCount > 0 ? "currentColor" : "none"} />
                </motion.div>
                
                {pendingCount > 0 && (
                  <>
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center border-2 border-white z-10">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-40" />
                  </>
                )}
              </button>
              {/* Dropdown remains same but styled for mobile */}
              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="fixed sm:absolute top-14 right-4 left-4 sm:left-auto sm:right-0 mt-2 w-auto sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60]"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <p className="text-sm font-bold text-gray-900">Neue Bestellungen</p>
                      <button onClick={() => setBellOpen(false)} className="text-gray-400"><X size={16}/></button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {pendingOrders.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-400">
                          <Bell size={24} className="mx-auto mb-2 opacity-20" />
                          Keine neuen Bestellungen
                        </div>
                      ) : (
                        pendingOrders.map(order => (
                          <Link
                            key={order.id}
                            to="/admin/bestellungen"
                            onClick={() => setBellOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                              <ShoppingBag size={16} className="text-yellow-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-black text-[#142328]">{order.order_number}</p>
                                <span className="text-[10px] font-bold text-gray-400">{new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{order.customer_name}</p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!Capacitor.isNativePlatform() && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="w-8 h-8 bg-[#142328] rounded-lg flex items-center justify-center text-white text-xs font-black hover:opacity-80 transition-opacity"
                >
                  {user?.full_name?.charAt(0) || 'A'}
                </button>
                {/* Profile dropdown content... */}
              </div>
            )}
          </div>
        </header>

        {/* Passwort ändern Modal */}
        <AnimatePresence>
          {showPwModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowPwModal(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
              >
                <h2 className="text-lg font-black text-gray-900 mb-5">Passwort ändern</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Neues Passwort</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPw.new ? 'text' : 'password'}
                        value={pwForm.newPassword}
                        onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                        placeholder="Mindestens 10 Zeichen"
                        className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#142328]"
                        required
                      />
                      <button type="button" onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Passwort bestätigen</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPw.confirm ? 'text' : 'password'}
                        value={pwForm.confirmPassword}
                        onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="Passwort wiederholen"
                        className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#142328]"
                        required
                      />
                      <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowPwModal(false)}
                      className="flex-1 py-2.5 text-sm font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      Abbrechen
                    </button>
                    <button type="submit" disabled={isSavingPw}
                      className="flex-1 py-2.5 text-sm font-bold bg-[#142328] text-white rounded-xl hover:bg-[#1e3540] transition-colors disabled:opacity-50">
                      {isSavingPw ? 'Wird gespeichert...' : 'Speichern'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
