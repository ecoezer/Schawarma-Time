import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Clock, Printer, XCircle, CheckCircle, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import type { Order, OrderStatus } from '@/types'
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const mockOrders: Order[] = [
  {
    id: '1', order_number: 'S47-ABC1', user_id: null,
    customer_name: 'Max Mustermann', customer_phone: '+49 172 1234567',
    customer_email: 'max@test.de', delivery_address: 'Musterstraße 1, 31134 Hildesheim',
    delivery_lat: null, delivery_lng: null,
    items: [
      { product_id: 'p1', product_name: 'Smash Burger', quantity: 2, unit_price: 7.50, extras: [], note: '', subtotal: 15.00 },
      { product_id: 'p12', product_name: 'Chili Cheese Pommes', quantity: 1, unit_price: 6.00, extras: [], note: '', subtotal: 6.00 },
    ],
    subtotal: 21.00, delivery_fee: 2.00, discount_amount: 0, coupon_code: null, total: 23.00,
    status: 'pending', payment_method: 'cash', estimated_delivery_time: 35,
    notes: 'Klingel defekt, bitte klopfen', rejection_reason: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', order_number: 'S47-ABC2', user_id: null,
    customer_name: 'Anna Schmidt', customer_phone: '+49 172 9876543',
    customer_email: 'anna@test.de', delivery_address: 'Hauptstraße 42, 31134 Hildesheim',
    delivery_lat: null, delivery_lng: null,
    items: [
      { product_id: 'p4', product_name: 'Triple Smash Burger', quantity: 1, unit_price: 9.50, extras: [], note: '', subtotal: 9.50 },
      { product_id: 'p18', product_name: 'Menü 1', quantity: 1, unit_price: 8.90, extras: [], note: '', subtotal: 8.90 },
    ],
    subtotal: 18.40, delivery_fee: 2.00, discount_amount: 0, coupon_code: null, total: 20.40,
    status: 'preparing', payment_method: 'card_on_delivery', estimated_delivery_time: 25,
    notes: null, rejection_reason: null,
    created_at: new Date(Date.now() - 15 * 60000).toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '3', order_number: 'S47-ABC3', user_id: null,
    customer_name: 'Tom Müller', customer_phone: '+49 152 1111222',
    customer_email: 'tom@test.de', delivery_address: 'Bahnhofstraße 7, 31134 Hildesheim',
    delivery_lat: null, delivery_lng: null,
    items: [
      { product_id: 'p2', product_name: 'Smash 47 Spezial Burger', quantity: 2, unit_price: 8.50, extras: [], note: '', subtotal: 17.00 },
    ],
    subtotal: 17.00, delivery_fee: 2.00, discount_amount: 0, coupon_code: null, total: 19.00,
    status: 'on_the_way', payment_method: 'cash', estimated_delivery_time: 10,
    notes: null, rejection_reason: null,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(), updated_at: new Date().toISOString(),
  },
]

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered']

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const audioRef = useRef<HTMLAudioElement>(null)

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const updateStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o))
    if (selectedOrder?.id === orderId) setSelectedOrder((prev) => prev ? { ...prev, status } : prev)
  }

  const cancelOrder = (orderId: string) => {
    updateStatus(orderId, 'cancelled')
    setSelectedOrder(null)
  }

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const idx = STATUS_FLOW.indexOf(current)
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
  }

  const handlePrint = (order: Order) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>Bestellung ${order.order_number}</title>
      <style>body{font-family:monospace;padding:20px;font-size:14px}h2{text-align:center}hr{border:1px dashed #000}table{width:100%}</style>
      </head><body>
      <h2>SMASH47</h2><p style="text-align:center">${order.order_number}</p><hr/>
      <p><b>Kunde:</b> ${order.customer_name}</p>
      <p><b>Tel:</b> ${order.customer_phone}</p>
      <p><b>Adresse:</b> ${order.delivery_address}</p>
      <hr/><table>
      ${order.items.map((i) => `<tr><td>${i.quantity}x ${i.product_name}</td><td style="text-align:right">€${i.subtotal.toFixed(2)}</td></tr>`).join('')}
      </table><hr/>
      <p style="text-align:right"><b>Gesamt: €${order.total.toFixed(2)}</b></p>
      <p>Zahlung: ${order.payment_method === 'cash' ? 'Bar' : 'Karte'}</p>
      ${order.notes ? `<p>Notiz: ${order.notes}</p>` : ''}
      </body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Orders List */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-gray-900">Bestellungen</h1>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['all', 'pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === s ? 'bg-[#142328] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {s === 'all' ? 'Alle' : getStatusLabel(s)}
              {s !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {orders.filter((o) => o.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Order cards */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedOrder(order)}
                className={`bg-white rounded-2xl p-4 shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedOrder?.id === order.id ? 'border-[#142328]' : 'border-transparent'
                } ${order.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#142328] rounded-xl flex items-center justify-center text-white shrink-0">
                    <ShoppingBag size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm">{order.order_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{order.customer_name}</p>
                    <p className="text-xs text-gray-500 truncate">{order.delivery_address}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm font-black">{formatPrice(order.total)}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs text-gray-400">{order.items.length} Artikel</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0 mt-1" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredOrders.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
              <p>Keine Bestellungen</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Panel */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 h-fit sticky top-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">{selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <XCircle size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Customer info */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1 text-sm">
              <p className="font-semibold">{selectedOrder.customer_name}</p>
              <p className="text-gray-500">{selectedOrder.customer_phone}</p>
              <p className="text-gray-500">{selectedOrder.delivery_address}</p>
              {selectedOrder.notes && (
                <p className="text-amber-700 bg-amber-50 px-2 py-1 rounded-lg text-xs mt-1">
                  📝 {selectedOrder.notes}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.quantity}× {item.product_name}</span>
                  <span className="font-semibold">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-black">
                <span>Gesamt</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {getNextStatus(selectedOrder.status) && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => updateStatus(selectedOrder.id, getNextStatus(selectedOrder.status)!)}
                >
                  <CheckCircle size={16} />
                  {getStatusLabel(getNextStatus(selectedOrder.status)!)}
                </Button>
              )}
              <Button
                variant="ghost"
                fullWidth
                onClick={() => handlePrint(selectedOrder)}
              >
                <Printer size={16} />
                Bon drucken
              </Button>
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => cancelOrder(selectedOrder.id)}
                >
                  <XCircle size={16} />
                  Stornieren
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
