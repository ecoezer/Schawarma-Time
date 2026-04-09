import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Clock, Banknote, CreditCard, Tag, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

type PaymentMethod = 'cash' | 'card_on_delivery'
type OrderStatus = 'form' | 'success'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { items, totalPrice, clearCart } = useCartStore()
  const { settings } = useRestaurantStore()

  const [status, setStatus] = useState<OrderStatus>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [orderNumber] = useState(`S47-${Date.now().toString(36).toUpperCase()}`)

  const [form, setForm] = useState({
    name: '', phone: '', email: '', street: '', city: '', postalCode: '', note: '',
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const subtotal = totalPrice()
  const deliveryFee = settings?.delivery_fee ?? 2.00
  const total = subtotal + deliveryFee - discount

  const validate = () => {
    const errs: Partial<typeof form> = {}
    if (!form.name.trim()) errs.name = 'Name ist erforderlich'
    if (!form.phone.trim()) errs.phone = 'Telefon ist erforderlich'
    if (!form.email.trim()) errs.email = 'E-Mail ist erforderlich'
    if (!form.street.trim()) errs.street = 'Straße ist erforderlich'
    if (!form.city.trim()) errs.city = 'Stadt ist erforderlich'
    if (!form.postalCode.trim()) errs.postalCode = 'PLZ ist erforderlich'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleApplyCoupon = () => {
    if (couponCode.toUpperCase() === 'SMASH10') {
      setDiscount(subtotal * 0.1)
      toast.success('10% Rabatt angewendet!')
    } else if (couponCode.toUpperCase() === 'WILLKOMMEN') {
      setDiscount(3.00)
      toast.success('€3,00 Rabatt angewendet!')
    } else {
      toast.error('Ungültiger Gutscheincode')
    }
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsLoading(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500))
    setIsLoading(false)
    clearCart()
    setStatus('success')
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
    <div className="min-h-screen bg-gray-50">
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
          {/* Form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Delivery address */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-[#142328]" />
                Lieferadresse
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input label="Vollständiger Name" placeholder="Max Mustermann" required
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    error={errors.name} />
                </div>
                <Input label="Telefon" placeholder="+49 172 1234567" required
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  error={errors.phone} />
                <Input label="E-Mail" type="email" placeholder="max@beispiel.de" required
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  error={errors.email} />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Anmerkungen</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="z.B. Klingel defekt, 2. Etage..."
                    rows={2}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#142328]"
                  />
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
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
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`${paymentMethod === method.id ? 'text-[#142328]' : 'text-gray-400'}`}>
                      {method.icon}
                    </div>
                    <span className={`text-sm font-semibold ${paymentMethod === method.id ? 'text-[#142328]' : 'text-gray-700'}`}>
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

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4">Deine Bestellung</h2>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.quantity}× {item.name}</p>
                      {item.selected_extras.length > 0 && (
                        <p className="text-xs text-gray-400">+ {item.selected_extras.map((e) => e.name).join(', ')}</p>
                      )}
                    </div>
                    <span className="font-semibold shrink-0">{formatPrice(item.total)}</span>
                  </div>
                ))}
              </div>

              <hr className="my-3" />

              {/* Coupon */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Gutscheincode"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#142328]"
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>

              {/* Price breakdown */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Zwischensumme</span><span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Rabatt</span><span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Liefergebühr</span><span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t">
                  <span>Gesamt</span><span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              onClick={handleSubmit}
            >
              Jetzt bestellen
            </Button>

            <p className="text-xs text-center text-gray-400">
              Mit der Bestellung stimmst du unseren{' '}
              <a href="/agb" className="underline hover:text-gray-600">AGB</a> und{' '}
              <a href="/datenschutz" className="underline hover:text-gray-600">Datenschutzbestimmungen</a> zu.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
