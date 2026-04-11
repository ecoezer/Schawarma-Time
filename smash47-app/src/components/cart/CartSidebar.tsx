import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, Minus, Plus, Trash2, ShoppingBag, Utensils } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { OrderNoteModal } from './OrderNoteModal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, totalQuantity, globalNote, setGlobalNote, clearCart } = useCartStore()
  const { settings } = useRestaurantStore()
  const navigate = useNavigate()
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)

  const total = totalPrice()
  const count = totalQuantity()
  const deliveryFee = settings?.delivery_fee ?? 2.00
  const minOrder = settings?.min_order_amount ?? 15.00
  const isMinOrderMet = total >= minOrder
  const grandTotal = total + (isMinOrderMet ? deliveryFee : 0)

  const handleGoToMenu = () => {
    closeCart()
    navigate('/')
    
    // Give time for navigation and cart closing animation
    setTimeout(() => {
      const el = document.getElementById('category-burger')
      if (el) {
        const offset = 220
        const top = el.getBoundingClientRect().top + window.scrollY - offset
        window.scrollTo({ top, behavior: 'smooth' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 150)
  }

  const handleCheckout = () => {
    closeCart()
    navigate('/bestellung')
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#142328]" />
                <h2 className="text-lg font-black text-gray-900">Warenkorb</h2>
                {count > 0 && (
                  <span className="bg-[#142328] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Empty State */}
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Dein Warenkorb ist leer</h3>
                <p className="text-sm text-gray-500 mb-6">Füge leckere Produkte aus unserem Menü hinzu!</p>
                  <Button 
                    variant="primary" 
                    fullWidth 
                    size="lg"
                    onClick={handleGoToMenu}
                  >
                    Menü ansehen
                  </Button>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3 bg-gray-50 rounded-xl p-3"
                      >
                        {/* Image */}
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-14 h-14 rounded-lg object-cover shrink-0"
                          />
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900">{item.name}</p>
                            <span className="shrink-0 bg-[#142328] text-white text-xs font-black px-2 py-0.5 rounded-full">×{item.quantity}</span>
                          </div>
                          {item.selected_extras.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.selected_extras.map((extra, idx) => (
                                <p key={idx} className="text-[12px] text-gray-500 leading-tight">
                                  + {extra.name}{extra.price > 0 ? ` (${formatPrice(extra.price * item.quantity)})` : ''}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.note && (
                            <p className="text-xs text-gray-400 italic mt-0.5">"{item.note}"</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity controls */}
                            <div className="flex items-center gap-1.5 bg-white rounded-full border border-gray-200 p-0.5">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-6 h-6 rounded-full bg-[#142328] flex items-center justify-center text-white hover:bg-[#1a2f36] transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-[#142328]">{formatPrice(item.total)}</span>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {/* Fiyat başına birim */}
                          {item.quantity > 1 && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{formatPrice(item.total / item.quantity)} pro Stück</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Additional Options */}
                  <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                    {/* Cutlery Request */}
                    <div className="flex items-center justify-between py-1 group">
                      <div className="flex items-center gap-3">
                        <Utensils size={18} className="text-black" />
                        <span className="text-[15px] font-bold text-black leading-tight">Besteck etc. anfordern</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-[20px] h-[20px] rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                      />
                    </div>

                    {/* Order Note Button */}
                    <button 
                      onClick={() => setIsNoteModalOpen(true)}
                      className="w-full flex items-center justify-between p-4 bg-[#f6f6f6] rounded-xl hover:bg-[#efefef] transition-colors group"
                    >
                      <div className="text-left overflow-hidden">
                        <p className="text-[15px] font-bold text-black">
                          {globalNote ? 'Bestellnotiz' : 'Bestellnotiz hinzufügen'}
                        </p>
                        <p className="text-[13px] text-gray-500 mt-0.5 leading-tight truncate">
                          {globalNote || 'Besteck, besondere Anweisungen usw.'}
                        </p>
                      </div>
                      <Plus size={20} className="text-black shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-6 pt-4 border-t border-gray-100 bg-white space-y-3">
                  {/* Min order warning */}
                  {!isMinOrderMet && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
                      <span className="font-semibold">Mindestbestellung: {formatPrice(minOrder)}</span>
                      <br />
                      Noch {formatPrice(minOrder - total)} bis zum Mindestbestellwert.
                      <div className="mt-2 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-amber-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((total / minOrder) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Price summary */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Zwischensumme</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Liefergebühr</span>
                      <span>{isMinOrderMet ? formatPrice(deliveryFee) : '–'}</span>
                    </div>
                    <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
                      <span>Gesamt</span>
                      <span>{isMinOrderMet ? formatPrice(grandTotal) : formatPrice(total)}</span>
                    </div>
                  </div>

                  {/* Checkout button */}
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    disabled={!isMinOrderMet}
                    onClick={handleCheckout}
                  >
                    Zur Kasse · {formatPrice(isMinOrderMet ? grandTotal : total)}
                  </Button>

                  {/* Clear cart button */}
                  <button
                    onClick={() => setIsClearConfirmOpen(true)}
                    className="w-full py-2 text-[14px] text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors mt-1"
                  >
                    Warenkorb leeren
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <OrderNoteModal 
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        initialNote={globalNote}
        onSave={setGlobalNote}
      />

      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={clearCart}
        title="Warenkorb leeren?"
        message="Möchtest du wirklich alle Artikel aus deinem Warenkorb entfernen? Dieser Vorgang kann nicht rückgängig gemacht werden."
        confirmText="Leeren"
        cancelText="Abbrechen"
        isDangerous={true}
      />
    </>
  )
}
