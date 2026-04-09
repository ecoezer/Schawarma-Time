import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Clock, Banknote, CreditCard, Tag, CheckCircle, AlertCircle, Home, Briefcase, Navigation } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPrice, isRestaurantOpen } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { UserAddress } from '@/types'

type PaymentMethod = 'cash' | 'card_on_delivery'
type OrderStatus = 'form' | 'success'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { items, totalPrice, clearCart } = useCartStore()
  const { settings } = useRestaurantStore()

  // Enforce authentication
  useEffect(() => {
    if (!user) {
      toast.error('Bitte melde dich an, um fortzufahren')
      navigate('/login?redirect=/bestellung')
    }
  }, [user, navigate])

  const [status, setStatus] = useState<OrderStatus>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [orderNumber] = useState(`S47-${Date.now().toString(36).toUpperCase()}`)

  // Prefill user data if available
  const [form, setForm] = useState({
    name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    street: '',
    city: 'Hildesheim',
    postalCode: '31134',
    note: '',
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const subtotal = totalPrice()

  // Business Rules Validation
  const isOpen = useMemo(() => settings ? isRestaurantOpen(settings.hours) : false, [settings])
  const isDeliveryActive = settings?.is_delivery_active ?? true
  
  const activeZone = useMemo(() => {
    if (!settings?.delivery_zones || settings.delivery_zones.length === 0) return null
    return settings.delivery_zones.find(z => 
      z.name.includes(form.postalCode) || 
      (z as any).postal_codes?.includes(form.postalCode)
    )
  }, [settings, form.postalCode])

  const isZoneValid = useMemo(() => {
    if (!settings?.delivery_zones || settings.delivery_zones.length === 0) return true
    return !!activeZone
  }, [settings, activeZone])

  const currentMinOrder = activeZone?.min_order ?? settings?.min_order_amount ?? 15.00
  const isAboveMinOrder = subtotal >= currentMinOrder
  const deliveryFee = activeZone?.delivery_fee ?? settings?.delivery_fee ?? 2.00
  const total = subtotal + deliveryFee - discount

  const canOrder = isOpen && isDeliveryActive && isAboveMinOrder && isZoneValid

  const selectAddress = (addr: UserAddress) => {
    setForm(prev => ({
      ...prev,
      street: addr.street,
      city: addr.city,
      postalCode: addr.postal_code
    }))
    toast.success(`Adresse '${addr.label}' ausgewählt`)
  }

  const validate = () => {
    const errs: Partial<typeof form> = {}
    if (!form.name.trim()) errs.name = 'Name ist erforderlich'
    if (!form.phone.trim()) errs.phone = 'Telefon ist erforderlich'
    if (!form.email.trim()) errs.email = 'E-Mail ist erforderlich'
    if (!form.street.trim()) errs.street = 'Straße ist erforderlich'
    if (!form.city.trim()) errs.city = 'Stadt ist erforderlich'
    if (!form.postalCode.trim()) errs.postalCode = 'PLZ ist erforderlich'
    
    if (!isZoneValid) {
        errs.postalCode = 'Wir liefern aktuell nicht in dieses Gebiet'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0 && canOrder
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return
    setIsLoading(true)
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !coupon) {
        toast.error('Ungültiger Gutscheincode')
        setDiscount(0)
        return
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast.error('Dieser Gutschein ist abgelaufen')
        setDiscount(0)
        return
      }

      if (subtotal < coupon.min_order_amount) {
        toast.error(`Mindestbestellwert für diesen Gutschein ist ${formatPrice(coupon.min_order_amount)}`)
        setDiscount(0)
        return
      }

      let amount = 0
      if (coupon.discount_type === 'percentage') {
        amount = (subtotal * coupon.discount_value) / 100
      } else {
        amount = coupon.discount_value
      }

      setDiscount(amount)
      toast.success('Gutschein angewendet!')
    } catch (err) {
      toast.error('Fehler bei der Gutscheinprüfung')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validate()) {
        if (!canOrder) {
            if (!isOpen) toast.error('Wir haben aktuell geschlossen')
            else if (!isAboveMinOrder) toast.error(`Mindestbestellwert ist ${formatPrice(settings?.min_order_amount || 0)}`)
            else if (!isZoneValid) toast.error('Wir liefern nicht in dieses Gebiet')
        }
        return
    }
    setIsLoading(true)
    
    try {
      const orderData = {
        order_number: orderNumber,
        user_id: user?.id,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email,
        delivery_address: `${form.street}, ${form.postalCode} ${form.city}`,
        items: items.map(item => ({
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          extras: item.selected_extras,
          note: item.note,
          subtotal: item.total
        })),
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        discount_amount: discount,
        coupon_code: couponCode || null,
        total: total,
        status: 'pending',
        payment_method: paymentMethod,
        estimated_delivery_time: settings?.estimated_delivery_time || 35,
        notes: form.note || null
      }

      const { error } = await supabase
        .from('orders')
        .insert([orderData])

      if (error) throw error

      clearCart()
      setStatus('success')
      toast.success('Bestellung erfolgreich aufgegeben!')
    } catch (err: any) {
      console.error('Order submission error:', err)
      toast.error('Fehler beim Aufgeben der Bestellung: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      setIsLoading(false)
    }
  }

  if (items.length === 0 && status !== 'success') {
    navigate('/')
    return null
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle size={40} className="text-green-500" />
          </motion.div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Bestellung aufgegeben! 🎉</h1>
          <p className="text-gray-500 mb-4">Deine Bestellung wird sofort zubereitet.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Bestellnummer</p>
            <p className="text-xl font-black text-[#142328]">{orderNumber}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
            <Clock size={16} />
            <span>Geschätzte Lieferzeit: {settings?.estimated_delivery_time ?? 35}–{(settings?.estimated_delivery_time ?? 35) + 10} Min.</span>
          </div>
          <Button variant="primary" fullWidth onClick={() => navigate('/')}>
            Zurück zum Menü
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ChevronLeft size={18} />
          Zurück
        </button>

        <h1 className="text-2xl font-black text-[#142328] mb-6">Kasse</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Business Status Warnings */}
            {!isOpen && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-4 text-red-700">
                <AlertCircle className="shrink-0" />
                <div>
                  <p className="font-bold text-sm">Aktuell geschlossen</p>
                  <p className="text-xs opacity-80">Wir nehmen momentan keine Bestellungen entgegen. Bitte versuche es später während unserer Öffnungszeiten.</p>
                </div>
              </div>
            )}

            {isOpen && !isAboveMinOrder && (
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex gap-4 text-orange-700">
                <AlertCircle className="shrink-0" />
                <div>
                  <p className="font-bold text-sm">Mindestbestellwert nicht erreicht</p>
                  <p className="text-xs opacity-80">Dir fehlen noch {formatPrice(currentMinOrder - subtotal)} zum Mindestbestellwert ({formatPrice(currentMinOrder)}).</p>
                </div>
              </div>
            )}

            {/* Address Selection (if registered) */}
            {user && user.addresses && user.addresses.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Navigation size={18} className="text-[#142328]" />
                        Gespeicherte Adressen
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {user.addresses.map((addr) => (
                            <button
                                key={addr.id}
                                onClick={() => selectAddress(addr)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all whitespace-nowrap ${
                                    form.street === addr.street && form.postalCode === addr.postal_code
                                        ? 'border-[#142328] bg-[#142328]/5 text-[#142328]'
                                        : 'border-gray-50 hover:border-gray-100 text-gray-500'
                                }`}
                            >
                                {addr.label === 'Zuhause' ? <Home size={16} /> : addr.label === 'Büro' ? <Briefcase size={16} /> : <MapPin size={16} />}
                                <span className="text-sm font-bold">{addr.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Delivery Form */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-white">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-[#142328]" />
                Lieferadresse
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <Input label="Vollständiger Name" placeholder="Max Mustermann" required
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    error={errors.name} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Input label="Telefon" placeholder="+49 172 1234567" required
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    error={errors.phone} />
                </div>
                <div className="col-span-2">
                    <Input label="Straße & Hausnummer" placeholder="Musterstraße 1" required
                        value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })}
                        error={errors.street} />
                </div>
                <Input label="PLZ" placeholder="31134" required
                  value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  error={errors.postalCode} />
                <Input label="Stadt" placeholder="Hildesheim" required
                  value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  error={errors.city} />
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Anmerkungen</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="z.B. Klingel defekt, 2. Etage..."
                    rows={2}
                    className="w-full text-sm font-medium border border-gray-100 rounded-xl p-3 resize-none focus:outline-none focus:border-[#142328] transition-colors bg-gray-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-white">
              <h2 className="font-bold text-gray-900 mb-4">Zahlungsmethode</h2>
              <div className="space-y-2">
                {[
                  { id: 'cash', icon: <Banknote size={18} />, label: 'Barzahlung bei Lieferung' },
                  { id: 'card_on_delivery', icon: <CreditCard size={18} />, label: 'Kartenzahlung bei Lieferung' },
                ] .map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      paymentMethod === method.id
                        ? 'border-[#142328] bg-[#142328]/5'
                        : 'border-gray-50 hover:border-gray-100'
                    }`}
                  >
                    <div className={`${paymentMethod === method.id ? 'text-[#142328]' : 'text-gray-400'}`}>
                      {method.icon}
                    </div>
                    <span className={`text-sm font-bold ${paymentMethod === method.id ? 'text-[#142328]' : 'text-gray-700'}`}>
                      {method.label}
                    </span>
                    {paymentMethod === method.id && (
                      <CheckCircle size={18} className="ml-auto text-[#142328]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-white sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">Übersicht</h2>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{item.quantity}× {item.name}</p>
                      {item.selected_extras.length > 0 && (
                        <p className="text-[10px] text-gray-400 font-medium">+ {item.selected_extras.map((e) => e.name).join(', ')}</p>
                      )}
                    </div>
                    <span className="font-bold text-[#142328] shrink-0">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>

              <hr className="my-4 border-gray-50" />

              {/* Coupon */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Gutscheincode"
                    className="w-full pl-8 pr-3 py-2 text-sm font-bold border border-gray-100 rounded-xl focus:outline-none focus:border-[#142328] bg-gray-50/50"
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-[#f6f6f6] hover:bg-[#e2e2e2] text-xs font-black rounded-xl transition-all"
                >
                  OK
                </button>
              </div>

              {/* Price breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Zwischensumme</span><span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#06c167] font-bold">
                    <span>Gutschein</span><span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Liefergebühr</span><span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-lg pt-4 border-t border-gray-50 mt-2">
                  <span>Gesamt</span><span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    isLoading={isLoading}
                    disabled={!canOrder}
                    onClick={handleSubmit}
                    className={!canOrder ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                >
                    {isLoading ? 'Verarbeitung...' : 'Jetzt bestellen'}
                </Button>
                
                <p className="text-[10px] text-center text-gray-400 font-medium leading-relaxed">
                  Mit der Bestellung stimmst du unseren{' '}
                  <a href="/agb" className="underline hover:text-gray-600">AGB</a> ve{' '}
                  <a href="/datenschutz" className="underline hover:text-gray-600">Datenschutzbestimmungen</a> zu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
