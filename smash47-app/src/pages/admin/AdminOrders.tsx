import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Clock, Printer, XCircle, CheckCircle, ChevronRight, Volume2, VolumeX } from 'lucide-react'
import type { Order, OrderStatus } from '@/types'
import { formatPrice, getStatusColor, getStatusLabel } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered']

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    const { data, error: sbError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (sbError) {
      console.error('Fetch orders error:', sbError)
      setError(sbError.message)
    } else if (data) {
      setOrders(data as Order[])
    }
    setIsLoading(false)
  }

  // Fetch initial orders
  useEffect(() => {
    fetchOrders()

    // Realtime subscription
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => [newOrder, ...prev])
            if (soundEnabled) {
              const audio = new Audio('/order-notification.mp3')
              audio.play().catch(e => console.warn('Audio play failed:', e))
            }
            toast.success(`Neue Bestellung: ${newOrder.order_number}`)
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o))
            if (selectedOrder?.id === updatedOrder.id) {
              setSelectedOrder(updatedOrder)
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [soundEnabled, selectedOrder?.id])

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (error) throw error
      
      toast.success(`Status aktualisiert: ${getStatusLabel(status)}`)
    } catch (err: any) {
      toast.error('Fehler beim Aktualisieren: ' + err.message)
    }
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
      ${order.items.map((i) => `
        <tr>
          <td>
            ${i.quantity}x ${i.product_name}
            ${i.extras && i.extras.length > 0 ? 
              `<br/><small style="color:#666;margin-left:10px">+ ${i.extras.map(e => `${e.name}${e.price > 0 ? ` (€${(e.price * i.quantity).toFixed(2)})` : ''}`).join(', ')}</small>` 
              : ''}
          </td>
          <td style="text-align:right" valign="top">€${i.subtotal.toFixed(2)}</td>
        </tr>
      `).join('')}
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
          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Lädt...</div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500 font-bold mb-2">Fehler: {error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchOrders()}>Erneut versuchen</Button>
            </div>
          ) : (
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
          )}

          {!isLoading && filteredOrders.length === 0 && (
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

            <div className="space-y-3 mb-4">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm font-bold text-gray-900 leading-tight">
                    <span>{item.quantity}× {item.product_name}</span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </div>
                  {item.extras && item.extras.length > 0 && (
                    <div className="pl-4 space-y-0.5">
                      {item.extras.map((extra, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-gray-500 font-medium">
                          <span>+ {extra.name}</span>
                          {extra.price > 0 && <span>{formatPrice(extra.price * item.quantity)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.note && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md italic">
                      "{item.note}"
                    </p>
                  )}
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
