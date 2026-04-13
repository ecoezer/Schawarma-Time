import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, ShoppingBag, LogOut, Plus, Trash2, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import * as authService from '@/services/authService'
import { useCartStore } from '@/store/cartStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import * as orderService from '@/services/orderService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatPrice, getStatusLabel } from '@/lib/utils'
import type { Order, UserAddress } from '@/types'
import toast from 'react-hot-toast'

type Tab = 'profile' | 'addresses' | 'orders'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateProfile, addAddress, deleteAddress, signOut } = useAuthStore()
  const { addItems } = useCartStore()
  const { settings } = useRestaurantStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [orders, setOrders] = useState<Order[]>([])
  
  // Profile Form
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Password Form
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Address Form
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [addressForm, setAddressForm] = useState<Omit<UserAddress, 'id'>>({
    label: '',
    street: '',
    city: 'Hildesheim',
    postal_code: '31134',
    lat: null,
    lng: null
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    orderService.fetchUserOrders().then(setOrders).catch(() => {})

    // Realtime: status updates appear instantly without page refresh
    const unsub = orderService.subscribeToOrders((payload) => {
      const { eventType, new: next, old } = payload
      if (eventType === 'UPDATE' && next.user_id === user.id) {
        orderService.fetchOrderById(next.id).then(full => {
          if (full) setOrders(prev => prev.map(o => o.id === full.id ? full : o))
        })
      } else if (eventType === 'INSERT' && next.user_id === user.id) {
        orderService.fetchOrderById(next.id).then(full => {
          if (full) setOrders(prev => [full, ...prev])
        })
      } else if (eventType === 'DELETE') {
        setOrders(prev => prev.filter(o => o.id !== old.id))
      }
    })
    return unsub
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    try {
      await updateProfile(profileForm)
      toast.success('Profil aktualisiert!')
    } catch {
      toast.error('Fehler beim Aktualisieren des Profils')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addAddress(addressForm)
      setShowAddressModal(false)
      setAddressForm({ label: '', street: '', city: 'Hildesheim', postal_code: '31134', lat: null, lng: null })
      toast.success('Adresse hinzugefügt!')
    } catch (err) {
      toast.error('Fehler beim Hinzufügen der Adresse')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein')
      return
    }
    if (passwordForm.newPassword.length < 10) {
      toast.error('Passwort muss mindestens 10 Zeichen lang sein')
      return
    }
    setIsChangingPassword(true)
    try {
      await authService.changePassword(passwordForm.newPassword)
      toast.success('Passwort erfolgreich geändert!')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Ändern des Passworts')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleReorder = async (order: Order) => {
    // BLV-5: Fetch current product prices from DB — never reuse stale order prices
    try {
      const productIds = [...new Set(order.items.map(i => i.product_id))]
      const { data: products, error } = await (await import('@/lib/supabase')).supabase
        .from('products')
        .select('id, name, price, extra_groups, is_active, image_url')
        .in('id', productIds)
        .eq('is_active', true)

      if (error) throw error

      const productMap = new Map((products || []).map((p: any) => [p.id, p]))
      const unavailable: string[] = []
      const cartItems: any[] = []

      for (const item of order.items) {
        const product = productMap.get(item.product_id)
        if (!product) {
          unavailable.push(item.product_name)
          continue
        }

        // Resolve current extra prices from DB product definition
        const resolvedExtras = (item.extras || []).map((extra: any) => {
          for (const group of product.extra_groups || []) {
            for (const opt of group.options || []) {
              if (opt.id === extra.id) {
                return { ...extra, price: opt.price ?? 0 }
              }
            }
          }
          return null // extra no longer available
        }).filter(Boolean)

        cartItems.push({
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          selected_extras: resolvedExtras,
          image_url: product.image_url ?? null,
          note: item.note,
        })
      }

      if (unavailable.length > 0) {
        toast(`Nicht mehr verfügbar: ${unavailable.join(', ')}`, { icon: '⚠️' })
      }
      if (cartItems.length > 0) {
        addItems(cartItems, settings)
        toast.success('Produkte zum Warenkorb hinzugefügt!')
      } else {
        toast.error('Keine Produkte verfügbar')
      }
    } catch {
      toast.error('Fehler beim Wiederholen der Bestellung')
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header Section */}
      <div className="bg-[#142328] pt-12 pb-24 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-white text-3xl font-black border border-white/20 backdrop-blur-sm">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{user.full_name}</h1>
              <p className="text-white/60 text-sm">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
            className="p-3 bg-white/10 hover:bg-red-500/20 text-white rounded-2xl transition-all border border-white/10 flex items-center gap-2 group"
          >
            <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
            <span className="text-sm font-bold">Abmelden</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 -mt-12">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-1.5 flex gap-1 mb-6 border border-gray-100">
          {[
            { id: 'profile', icon: <User size={18} />, label: 'Profil' },
            { id: 'addresses', icon: <MapPin size={18} />, label: 'Adressen' },
            { id: 'orders', icon: <ShoppingBag size={18} />, label: 'Bestellungen' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#142328] text-white shadow-lg' 
                  : 'text-gray-500 hover:text-[#142328] hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
            >
              <h2 className="text-xl font-black mb-6">Persönliche Daten</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Vollständiger Name" 
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  />
                  <Input 
                    label="Telefonnummer" 
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">E-Mail (Nicht änderbar)</label>
                    <div className="px-4 py-3 bg-gray-50 rounded-xl text-gray-400 text-sm font-medium border border-gray-100">
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <Button type="submit" variant="primary" isLoading={isUpdatingProfile} className="min-w-[200px]">
                    Speichern
                  </Button>
                </div>
              </form>

              {/* Password Change */}
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                  <Lock size={20} />
                  Passwort ändern
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Neues Passwort"
                      type={showPasswords.new ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      rightIcon={
                        <button type="button" onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}>
                          {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    <Input
                      label="Passwort bestätigen"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      rightIcon={
                        <button type="button" onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}>
                          {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                  </div>
                  <div className="pt-2">
                    <Button type="submit" variant="secondary" isLoading={isChangingPassword} className="min-w-[200px]">
                      Passwort ändern
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'addresses' && (
            <motion.div
              key="addresses"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-2 px-2">
                <h2 className="text-xl font-black">Lieferadressen</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAddressModal(true)} className="text-[#142328]">
                  <Plus size={18} />
                  Neu hinzufügen
                </Button>
              </div>

              {(user.addresses || []).length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <MapPin size={32} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Keine Adressen</h3>
                  <p className="text-sm text-gray-500 mb-6">Füge eine Adresse hinzu, um schneller zu bestellen.</p>
                  <Button variant="primary" onClick={() => setShowAddressModal(true)}>
                    Jetzt hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(user.addresses || []).map((addr) => (
                    <motion.div 
                      key={addr.id}
                      layout
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-black text-[#142328] uppercase tracking-wider">{addr.label}</span>
                          {addr.label === 'Zuhause' && <span className="text-xs">🏠</span>}
                        </div>
                        <p className="text-base font-medium text-gray-900">{addr.street}</p>
                        <p className="text-sm text-gray-500">{addr.postal_code} {addr.city}</p>
                      </div>
                      <button 
                        onClick={() => deleteAddress(addr.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all self-start md:opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-black mb-2 px-2">Deine Bestellungen</h2>

              {orders.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <ShoppingBag size={32} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Keine Bestellungen</h3>
                  <p className="text-sm text-gray-500 mb-6">Du hast noch keine Bestellungen aufgegeben.</p>
                  <Button variant="primary" onClick={() => navigate('/')}>
                    Jetzt Menü ansehen
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">
                            🍔
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{order.order_number}</p>
                            <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('de-DE')} • {formatPrice(order.total)}</p>
                          </div>
                        </div>
                        <Badge variant={order.status === 'delivered' ? 'success' : 'pending'}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>

                      {/* Order Tracking */}
                      {['pending', 'confirmed', 'preparing', 'on_the_way'].includes(order.status) && (() => {
                        const steps = [
                          { key: 'pending',    icon: '🕐', label: 'Eingang' },
                          { key: 'confirmed',  icon: '✅', label: 'Bestätigt' },
                          { key: 'preparing',  icon: '👨‍🍳', label: 'Zubereitung' },
                          { key: 'on_the_way', icon: '🛵', label: 'Unterwegs' },
                        ]
                        const currentIdx = steps.findIndex(s => s.key === order.status)
                        return (
                          <div className="mb-5 p-4 bg-[#142328] rounded-2xl text-white">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-0.5">Aktueller Status</p>
                                <p className="font-black text-base">{steps[currentIdx].icon} {getStatusLabel(order.status)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-0.5">Lieferzeit</p>
                                <p className="font-black text-base">{order.estimated_delivery_time || 35}–{(order.estimated_delivery_time || 35) + 10} Min</p>
                              </div>
                            </div>

                            {/* Steps */}
                            <div className="flex items-center gap-0">
                              {steps.map((step, idx) => {
                                const done = idx < currentIdx
                                const active = idx === currentIdx
                                return (
                                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                                    {/* Circle */}
                                    <div className="flex flex-col items-center gap-1">
                                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-black border-2 transition-all ${
                                        done   ? 'bg-[#06c167] border-[#06c167] text-white' :
                                        active ? 'bg-white border-white text-[#142328] scale-110 shadow-lg shadow-white/20' :
                                                 'bg-white/10 border-white/20 text-white/40'
                                      }`}>
                                        {done ? '✓' : active ? (() => {
                                          if (step.key === 'pending')
                                            return <motion.span animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>🕐</motion.span>
                                          if (step.key === 'confirmed')
                                            return <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>✅</motion.span>
                                          if (step.key === 'preparing')
                                            return <motion.span animate={{ rotate: [-15, 15, -15] }} transition={{ repeat: Infinity, duration: 0.5 }}>👨‍🍳</motion.span>
                                          if (step.key === 'on_the_way')
                                            return <motion.span animate={{ x: [0, 3, 0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>🛵</motion.span>
                                          return <span>{step.icon}</span>
                                        })() : step.icon}
                                      </div>
                                      <span className={`text-[9px] font-black uppercase tracking-wide text-center whitespace-nowrap ${
                                        active ? 'text-white' : done ? 'text-[#06c167]' : 'text-white/30'
                                      }`}>{step.label}</span>
                                    </div>
                                    {/* Connector */}
                                    {idx < steps.length - 1 && (
                                      <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full overflow-hidden bg-white/10">
                                        {idx < currentIdx ? (
                                          // Tamamlanan çizgi — tam dolu yeşil
                                          <div className="h-full w-full bg-[#06c167]" />
                                        ) : idx === currentIdx ? (
                                          // Aktif çizgi — akan animasyon
                                          <motion.div
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                            className="h-full w-1/2 bg-gradient-to-r from-transparent via-[#06c167] to-transparent"
                                          />
                                        ) : (
                                          // Gelecek çizgi — boş
                                          <div className="h-full w-0" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-50">
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {order.items.map(i => i.product_name).join(', ')}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleReorder(order)} className="text-[#142328]">
                                Wiederholen
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => {}}>
                                Details
                            </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Address Modal */}
      <AnimatePresence>
        {showAddressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddressModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl relative z-10"
            >
              <h2 className="text-2xl font-black mb-6">Neue Adresse</h2>
              <form onSubmit={handleAddAddress} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input 
                        label="Bezeichnung" 
                        placeholder="Zuhause, Büro, etc." 
                        required
                        value={addressForm.label}
                        onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input 
                        label="Straße & Hausnummer" 
                        placeholder="Bahnhofsallee 14a" 
                        required
                        value={addressForm.street}
                        onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    />
                  </div>
                  <Input 
                    label="PLZ" 
                    placeholder="31134" 
                    required
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                  />
                  <Input 
                    label="Stadt" 
                    placeholder="Hildesheim" 
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="ghost" fullWidth onClick={() => setShowAddressModal(false)}>
                    Abbrechen
                  </Button>
                  <Button type="submit" variant="primary" fullWidth>
                    Speichern
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
