import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Clock, Banknote, CreditCard, Tag, CheckCircle, AlertCircle, Home, Briefcase, Navigation, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useAuthStore } from '@/store/authStore'
import * as couponService from '@/services/couponService'
import * as orderService from '@/services/orderService'
import { updateProfile } from '@/services/authService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPrice, isRestaurantOpen } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { handleError } from '@/lib/errorHandler'
import toast from 'react-hot-toast'
import type { UserAddress } from '@/types'

type PaymentMethod = 'cash' | 'card_on_delivery'
type OrderStatus = 'form' | 'pending_confirmation' | 'success' | 'rejected'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { user, updateProfile, addAddress } = useAuthStore()
  const { items, totalPrice, clearCart, orderType } = useCartStore()
  const { settings } = useRestaurantStore()


  const [status, setStatus] = useState<OrderStatus>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string>('')  // set by server after order creation
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    settings?.payment_methods?.cash ? 'cash' : 'card_on_delivery'
  )
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    street: '',
    city: 'Nordstemmen',
    postalCode: '31171',
    note: '',
  })

  // Redirect if cart is empty (v11 fix: moved to useEffect to avoid render-phase navigation)
  useEffect(() => {
    if (items.length === 0 && status !== 'success') {
      navigate('/')
    }
  }, [items.length, status, navigate])

  // Sync form with user data when it's loaded
  useEffect(() => {
    if (user && !isLoading) { // Don't overwrite while loading/submitting
      const defaultAddress = user.addresses?.[0]
      setForm(prev => ({
        ...prev,
        name: prev.name || user.full_name || '',
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || '',
        street: prev.street || defaultAddress?.street || '',
        city: (prev.city === 'Nordstemmen' || !prev.city) ? (defaultAddress?.city || 'Nordstemmen') : prev.city,
        postalCode: (prev.postalCode === '31171' || !prev.postalCode) ? (defaultAddress?.postal_code || '31171') : prev.postalCode,
      }))
    }
  }, [user])
  const [errors, setErrors] = useState<Partial<typeof form>>({})
  const [warningModal, setWarningModal] = useState<{ title: string; message: string; icon?: string } | null>(null)

  // Realtime: Auf Admin-Bestätigung oder Ablehnung warten
  useEffect(() => {
    if (status !== 'pending_confirmation' || !orderId) return

    return orderService.subscribeToOrder(orderId, (record) => {
      if (!record) return
      if (record.user_id && record.user_id !== user?.id) return

      const newStatus = record.status
      if (newStatus === 'confirmed' || newStatus === 'preparing' || newStatus === 'on_the_way') {
        setStatus('success')
      } else if (newStatus === 'cancelled') {
        setStatus('rejected')
      }
    })
  }, [status, orderId])

  const isAbholung = orderType === 'abholung'
  const subtotal = totalPrice()

  // Unified form field handler — eliminates per-field onChange boilerplate
  const handleField = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  // Business Rules Validation
  const isOpen = settings ? isRestaurantOpen(settings.hours) : false
  const isDeliveryActive = isAbholung ? true : (settings?.is_delivery_active ?? true)

  const activeZone = !isAbholung && settings?.delivery_zones?.length
    ? settings.delivery_zones.find(z =>
        z.name.includes(form.postalCode) ||
        (z as any).postal_codes?.includes(form.postalCode)
      )
    : null

  const isZoneValid = isAbholung || !settings?.delivery_zones?.length || !!activeZone

  const currentMinOrder = isAbholung ? 0 : (activeZone?.min_order ?? settings?.min_order_amount ?? 15.00)
  const isAboveMinOrder = subtotal >= currentMinOrder
  const deliveryFee = isAbholung ? 0 : (activeZone?.delivery_fee ?? settings?.delivery_fee ?? 2.00)
  const total = subtotal + deliveryFee - discount

  const hasPaymentMethod = (settings?.payment_methods?.cash ?? true) || (settings?.payment_methods?.card_on_delivery ?? true)
  const canOrder = isOpen && isDeliveryActive && isAboveMinOrder && isZoneValid && hasPaymentMethod

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
    if (!form.phone.trim()) {
      errs.phone = 'Telefon ist erforderlich'
    }
    if (!form.email.trim()) errs.email = 'E-Mail ist erforderlich'
    
    if (!isAbholung) {
      if (!form.street.trim()) errs.street = 'Straße ist erforderlich'
      if (!form.city.trim()) errs.city = 'Stadt ist erforderlich'
      if (!form.postalCode.trim()) errs.postalCode = 'PLZ ist erforderlich'
      
      if (!isZoneValid) {
          errs.postalCode = 'Wir liefern aktuell nicht in dieses Gebiet'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0 && canOrder
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return
    setIsLoading(true)
    try {
      const result = await couponService.validateCoupon(couponCode, subtotal, user?.id)
      if (!result.valid) {
        toast.error((t) => (
          <span className="flex items-center gap-2">
            {result.errorMessage || 'Ungültiger Gutscheincode'}
            <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
          </span>
        ), { duration: Infinity })
        setDiscount(0)
        return
      }
      setDiscount(result.discount)
      toast.success('Gutschein angewendet!')
    } catch (err) {
      handleError(err, 'Gutscheinprüfung')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validate()) {
        if (!canOrder) {
            if (!isOpen) {
              setWarningModal({
                title: 'Aktuell geschlossen',
                message: 'Wir haben aktuell geschlossen oder nehmen momentan keine Bestellungen an. Bitte versuche es später während unserer Öffnungszeiten.',
                icon: '⏳'
              })
            } else if (!isAboveMinOrder) {
              setWarningModal({
                title: 'Mindestbestellwert',
                message: `Der Mindestbestellwert für deine Region beträgt ${formatPrice(currentMinOrder)}. Bitte füge weitere Artikel hinzu.`,
                icon: '⚠️'
              })
            } else if (!isZoneValid) {
              setWarningModal({
                title: 'Liefergebiet',
                message: 'Leider liefern wir aktuell nicht an die angegebene PLZ. Bitte prüfe deine Eingabe.',
                icon: '📍'
              })
            } else if (!hasPaymentMethod) {
              setWarningModal({
                title: 'Zahlungsmethoden',
                message: 'Aktuell sind keine Zahlungsmethoden verfügbar. Bitte kontaktiere uns telefonisch.',
                icon: '💳'
              })
            }
        }
        return
    }
    setIsLoading(true)
    
    try {
      const result = await orderService.createOrder({
        customer_name:    form.name,
        customer_phone:   form.phone,
        customer_email:   form.email,
        delivery_address: isAbholung ? 'Selbstabholung' : `${form.street}, ${form.postalCode} ${form.city}`,
        // Only IDs + quantities — prices calculated server-side
        items: items.map(item => ({
          product_id: item.product_id,
          quantity:   item.quantity,
          extras:     item.selected_extras,
          note:       item.note,
        })),
        coupon_code:    couponCode || null,
        payment_method: paymentMethod,
        // v11: estimated_delivery_time removed from client payload —
        // server reads it from restaurant_settings to prevent promise manipulation.
        notes: form.note || null,
      })

      clearCart()
      // Server returns { id, order_number } — set both from result
      setOrderId(result.id)
      setOrderNumber(result.order_number)
      
      // Save address to profile if user is logged in and doesn't have this address yet
      if (user) {
        const hasAddress = user.addresses?.some(a => 
          a.street.toLowerCase() === form.street.toLowerCase() && 
          a.postal_code === form.postalCode
        )
        
        if (!hasAddress) {
          await addAddress({
            label: user.addresses?.length === 0 ? 'Zuhause' : `Adresse ${user.addresses.length + 1}`,
            street: form.street,
            city: form.city,
            postal_code: form.postalCode,
            lat: null,
            lng: null
          })
        }
        
        // Also save phone if profile is missing it
        if (!user.phone && form.phone) {
          await updateProfile({ phone: form.phone })
        }
      }

      toast.success('Bestellung erfolgreich aufgegeben!')
      toast.success('Bestellung eingegangen! Wir bestätigen gleich.')
    } catch (err) {
      // Surface friendly coupon-specific message for phone-hash rejection
      const msg = err instanceof Error ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : 'Unbekannter Fehler'

      if (msg.includes('phone number') || msg.includes('first order')) {
        setWarningModal({
          title: 'Gutschein-Hinweis',
          message: 'Dieser Gutschein wurde bereits von dieser Telefonnummer genutzt.',
          icon: '🏷️'
        })
        setCouponCode('')
        setDiscount(0)
      } else if (msg.includes('delivery zone') || msg.includes('outside')) {
        setWarningModal({
          title: 'Liefergebiet',
          message: 'Deine Adresse liegt außerhalb unserer Lieferzone.',
          icon: '📍'
        })
      } else if (msg.includes('Discount cannot exceed')) {
        setWarningModal({
          title: 'Gutschein-Limit',
          message: 'Der Gutschein überschreitet das erlaubte Rabattlimit.',
          icon: '🏷️'
        })
        setCouponCode('')
        setDiscount(0)
      } else {
        handleError(err, 'Bestellung aufgeben')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'pending_confirmation') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Clock size={40} className="text-yellow-500 animate-pulse" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Bestellung eingegangen! ⏳</h1>
          <p className="text-gray-500 mb-4">Wir prüfen deine Bestellung und bestätigen sie in Kürze.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Bestellnummer</p>
            <p className="text-xl font-black text-[#142328]">{orderNumber}</p>
          </div>
          <p className="text-sm text-gray-400">Diese Seite aktualisiert sich automatisch.</p>
        </motion.div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Bestellung abgelehnt 😔</h1>
          <p className="text-gray-500 mb-6">Leider konnten wir deine Bestellung nicht annehmen. Bitte ruf uns an.</p>
          <p className="font-bold text-[#142328] text-lg mb-6">05069 8067500</p>
          <Button variant="primary" fullWidth onClick={() => navigate('/')}>
            Zurück zum Menü
          </Button>
        </motion.div>
      </div>
    )
  }

  if (items.length === 0 && status !== 'success') {
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
            <span>{isAbholung ? 'Geschätzte Abholzeit' : 'Geschätzte Lieferzeit'}: {isAbholung ? '15–20' : (settings?.estimated_delivery_time ?? 35) + '–' + ((settings?.estimated_delivery_time ?? 35) + 10)} Min.</span>
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
            {[
              !isOpen && {
                key: 'closed',
                bg: 'bg-red-50 border-red-100 text-red-700',
                title: 'Aktuell geschlossen',
                body: 'Wir nehmen momentan keine Bestellungen entgegen. Bitte versuche es später während unserer Öffnungszeiten.',
              },
              isOpen && !isAboveMinOrder && {
                key: 'minorder',
                bg: 'bg-orange-50 border-orange-100 text-orange-700',
                title: 'Mindestbestellwert nicht erreicht',
                body: `Dir fehlen noch ${formatPrice(currentMinOrder - subtotal)} zum Mindestbestellwert (${formatPrice(currentMinOrder)}).`,
              },
            ].filter(Boolean).map((w) => (
              <div key={(w as any).key} className={`border rounded-2xl p-4 flex gap-4 ${(w as any).bg}`}>
                <AlertCircle className="shrink-0" />
                <div>
                  <p className="font-bold text-sm">{(w as any).title}</p>
                  <p className="text-xs opacity-80">{(w as any).body}</p>
                </div>
              </div>
            ))}

            {/* Address Selection (if registered) */}
            {!isAbholung && user && user.addresses && user.addresses.length > 0 && (
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
                {isAbholung ? 'Kontaktdaten' : 'Lieferadresse'}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <Input label="Vollständiger Name" placeholder="Max Mustermann" required
                    value={form.name} onChange={handleField('name')} error={errors.name} />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Input label="Telefon" placeholder="05069 8067500" required
                    value={form.phone} onChange={handleField('phone')} error={errors.phone} />
                </div>
                {!isAbholung && (
                  <>
                    <div className="col-span-2">
                      <Input label="Straße & Hausnummer" placeholder="Musterstraße 1" required
                        value={form.street} onChange={handleField('street')} error={errors.street} />
                    </div>
                    <Input label="PLZ" placeholder="31171" required
                      value={form.postalCode} onChange={handleField('postalCode')} error={errors.postalCode} />
                    <Input label="Stadt" placeholder="Nordstemmen" required
                      value={form.city} onChange={handleField('city')} error={errors.city} />
                  </>
                )}
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
                  { id: 'cash', icon: <Banknote size={18} />, label: isAbholung ? 'Barzahlung bei Abholung' : 'Barzahlung bei Lieferung', active: settings?.payment_methods?.cash ?? true },
                  { id: 'card_on_delivery', icon: <CreditCard size={18} />, label: isAbholung ? 'Kartenzahlung bei Abholung' : 'Kartenzahlung bei Lieferung', active: settings?.payment_methods?.card_on_delivery ?? true },
                ].filter(m => m.active).map((method) => (
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
                {!isAbholung && (
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Liefergebühr</span><span>{formatPrice(deliveryFee)}</span>
                  </div>
                )}
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
                  <a href="/agb" className="underline hover:text-gray-600">AGB</a> und{' '}
                  <a href="/datenschutz" className="underline hover:text-gray-600">Datenschutzbestimmungen</a> zu.
                </p>
              </div>
            </div>
          </div>
        </div>

      <Modal
        isOpen={!!warningModal}
        onClose={() => setWarningModal(null)}
        title={warningModal?.title || ''}
        size="sm"
      >
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">{warningModal?.icon}</div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {warningModal?.message}
          </p>
          <Button variant="primary" fullWidth onClick={() => setWarningModal(null)}>
            Verstanden
          </Button>
        </div>
      </Modal>
      </div>
    </div>
  )
}
