import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, ShoppingBag, LogOut, Plus, Trash2, ChevronRight, Clock, Map as MapIcon, CheckCircle, Package, Truck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { formatPrice, getStatusColor, getStatusLabel } from '@/lib/utils'
import type { Order, UserAddress } from '@/types'
import toast from 'react-hot-toast'

type Tab = 'profile' | 'addresses' | 'orders'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateProfile, addAddress, deleteAddress, signOut } = useAuthStore()
  const { addItems } = useCartStore()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  
  // Profile Form
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    birth_date: user?.birth_date || '',
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

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
    fetchOrders()

    // Realtime subscription for user's orders
    const channel = supabase
      .channel(`user-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o))
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchOrders = async () => {
    if (!user) return
    setIsLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setOrders(data as Order[])
    } catch (err) {
      console.error('Fetch orders error:', err)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    try {
      await updateProfile(profileForm)
      toast.success('Profil aktualisiert!')
    } catch (err) {
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

  const handleReorder = (order: Order) => {
    const cartItems = order.items.map(item => ({
      product_id: item.product_id,
      name: item.product_name,
      price: item.unit_price,
      quantity: item.quantity,
      selected_extras: item.extras,
      image_url: null, // Since image_url isn't stored in OrderItem
      note: item.note,
    }))
    addItems(cartItems)
    toast.success('Produkte zum Warenkorb hinzugefügt!')
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
                  <div className="col-span-1">
                    <Input 
                      label="Geburtsdatum" 
                      type="date"
                      value={profileForm.birth_date}
                      onChange={(e) => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1">
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

              {isLoadingOrders ? (
                <div className="py-20 text-center text-gray-400">Lädt...</div>
              ) : orders.length === 0 ? (
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

                      {/* Display active tracking if not delivered/cancelled */}
                      {['pending', 'confirmed', 'preparing', 'on_the_way'].includes(order.status) && (
                        <div className="mb-6 p-4 bg-[#142328] rounded-2xl text-white overflow-hidden relative group">
                          <div className="flex items-center justify-between mb-4 relative z-10">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Status</p>
                              <h3 className="font-black text-lg flex items-center gap-2">
                                {order.status === 'on_the_way' ? <Truck size={20} className="animate-bounce" /> : <Package size={20} />}
                                {getStatusLabel(order.status)}
                              </h3>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Lieferzeit</p>
                              <p className="text-lg font-black">{order.estimated_delivery_time || 35} Min</p>
                            </div>
                          </div>
                          
                          {/* Progress Line */}
                          <div className="h-1.5 bg-white/10 rounded-full relative mb-1">
                            <motion.div 
                              initial={{ width: '0%' }}
                              animate={{ 
                                width: order.status === 'pending' ? '15%' : 
                                       order.status === 'confirmed' ? '40%' :
                                       order.status === 'preparing' ? '70%' : '90%'
                              }}
                              className="h-full bg-[#06c167] rounded-full shadow-[0_0_10px_rgba(6,193,103,0.5)]"
                            />
                          </div>

                          {/* Decorative pattern */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
                        </div>
                      )}

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
