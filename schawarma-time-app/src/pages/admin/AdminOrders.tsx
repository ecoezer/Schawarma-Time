import { useState, useMemo } from 'react'
import { ShoppingBag, Clock, Printer, XCircle, CheckCircle, ChevronRight, Volume2, VolumeX, ChevronLeft } from 'lucide-react'
import type { Order, OrderStatus } from '@/types'
import { formatPrice, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useOrderStore } from '@/store/orderStore'
import * as orderService from '@/services/orderService'
import { handleError } from '@/lib/errorHandler'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { Modal } from '@/components/ui/Modal'
import { Capacitor } from '@capacitor/core'
import toast from 'react-hot-toast'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'on_the_way', 'delivered']

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function AdminOrders() {
  const orders = useOrderStore(state => state.orders)
  const isLoading = useOrderStore(state => state.isLoading)
  const error = useOrderStore(state => state.error)
  const { soundEnabled, setSoundEnabled, fetchOrders, patchOrder } = useOrderStore()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null)
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false)
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null)

  const selectedOrder = useMemo(
    () => selectedOrderId ? (orders.find(o => o.id === selectedOrderId) ?? null) : null,
    [orders, selectedOrderId]
  )

  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  const updateStatus = async (orderId: string, status: OrderStatus, deliveryTime?: number) => {
    patchOrder(orderId, { 
      status, 
      ...(deliveryTime !== undefined ? { estimated_delivery_time: deliveryTime } : {}) 
    })
    try {
      await orderService.updateOrderStatus(orderId, status, deliveryTime)
      toast.success(`Status aktualisiert: ${getStatusLabel(status)}`)
    } catch (err) {
      patchOrder(orderId, { status: orders.find(o => o.id === orderId)?.status ?? status })
      handleError(err, 'Status aktualisieren')
    }
  }

  const handleStatusTransition = (orderId: string, currentStatus: OrderStatus) => {
    const next = getNextStatus(currentStatus)
    if (!next) return

    if (next === 'confirmed') {
      setPendingConfirmId(orderId)
      setIsTimeModalOpen(true)
    } else {
      toast.loading('Wird aktualisiert...', { id: 'status-update' })
      updateStatus(orderId, next).finally(() => toast.dismiss('status-update'))
    }
  }

  const cancelOrder = (orderId: string) => {
    setOrderToCancel(orderId)
    setIsCancelConfirmOpen(true)
  }

  const performCancel = () => {
    if (!orderToCancel) return
    updateStatus(orderToCancel, 'cancelled')
    setSelectedOrderId(null)
    setIsCancelConfirmOpen(false)
    setOrderToCancel(null)
  }

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    const idx = STATUS_FLOW.indexOf(current)
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null
  }

  const handlePrint = (order: Order) => {
    if (Capacitor.isNativePlatform()) {
      toast.success('Drucker-Anbindung wird vorbereitet...')
      return
    }

    try {
      const win = window.open('', '_blank')
      if (!win) {
        toast.error('Pop-up Blockiert! Bitte erlauben.')
        return
      }
      win.document.write(`
        <html><head><title>Bestellung ${escHtml(order.order_number)}</title>
        <style>body{font-family:monospace;padding:20px;font-size:14px}h2{text-align:center}hr{border:1px dashed #000}table{width:100%}</style>
        </head><body>
        <h2>SCHAWARMA-TIME</h2><p style="text-align:center">${escHtml(order.order_number)}</p><hr/>
        <p><b>Kunde:</b> ${escHtml(order.customer_name)}</p>
        <p><b>Tel:</b> ${escHtml(order.customer_phone)}</p>
        <p><b>Adresse:</b> ${escHtml(order.delivery_address)}</p>
        <hr/><table>
        ${order.items.map((i) => `
          <tr>
            <td>
              ${i.quantity}x ${escHtml(i.product_name)}
              ${i.extras && i.extras.length > 0 ?
                `<br/><small style="color:#666;margin-left:10px">+ ${i.extras.map(e => `${escHtml(e.name)}${e.price > 0 ? ` (€${(e.price * i.quantity).toFixed(2)})` : ''}`).join(', ')}</small>`
                : ''}
            </td>
            <td style="text-align:right" valign="top">€${i.subtotal.toFixed(2)}</td>
          </tr>
        `).join('')}
        </table><hr/>
        <p style="text-align:right"><b>Gesamt: €${order.total.toFixed(2)}</b></p>
        <p>Zahlung: ${order.payment_method === 'cash' ? 'Bar' : 'Karte'}</p>
        ${order.notes ? `<p>Notiz: ${escHtml(order.notes)}</p>` : ''}
        </body></html>`)
      win.document.close()
      setTimeout(() => {
        win.print()
        win.close()
      }, 500)
    } catch (e) {
      console.error('Print failed:', e)
      toast.error('Drucken fehlgeschlagen.')
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full relative bg-gray-50">
      {/* Orders List */}
      <div className={cn(
        "flex-1 min-w-0 p-4",
        selectedOrder ? "hidden lg:block" : "block"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-gray-900">Bestellungen</h1>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-500 uppercase">
                <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`} />
                {error ? 'Getrennt' : 'Verbunden'}
              </div>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filter === s ? 'bg-[#142328] text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {s === 'all' ? 'Alle' : getStatusLabel(s)}
              {s !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {statusCounts[s] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3 pb-20">
          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Lädt...</div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500 font-bold mb-2">Fehler: {error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchOrders()}>Erneut versuchen</Button>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={cn(
                  "bg-white rounded-2xl p-4 shadow-sm border-2 cursor-pointer transition-all",
                  selectedOrder?.id === order.id ? 'border-[#142328]' : 'border-transparent',
                  order.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''
                )}
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
              </div>
            ))
          )}

          {!isLoading && filteredOrders.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
              <p>Keine Bestellungen</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Panel - Full screen on mobile */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col lg:relative lg:inset-auto lg:z-0 lg:w-96 lg:shrink-0 lg:rounded-2xl lg:shadow-sm lg:border lg:border-gray-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <button 
              onClick={() => setSelectedOrderId(null)}
              className="lg:hidden flex items-center gap-2 text-sm font-bold text-gray-500"
            >
              <ChevronLeft size={18} />
              Zurück
            </button>
            <h2 className="font-bold text-gray-900">{selectedOrder.order_number}</h2>
            <button onClick={() => setSelectedOrderId(null)} className="hidden lg:block p-1 hover:bg-gray-100 rounded-lg">
              <XCircle size={18} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Customer info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-1 text-sm">
              <p className="font-bold text-base">{selectedOrder.customer_name}</p>
              <p className="text-gray-500 font-medium">{selectedOrder.customer_phone}</p>
              <p className="text-gray-500">{selectedOrder.delivery_address}</p>
              {selectedOrder.notes && (
                <div className="mt-3 p-3 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold leading-relaxed">
                  📝 {selectedOrder.notes}
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="pb-3 border-b border-gray-50 last:border-0">
                  <div className="flex justify-between text-sm font-bold text-gray-900 mb-1">
                    <span>{item.quantity}× {item.product_name}</span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </div>
                  {item.extras && item.extras.length > 0 && (
                    <div className="pl-4 space-y-0.5">
                      {item.extras.map((extra, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-gray-500">
                          <span>+ {extra.name}</span>
                          {extra.price > 0 && <span>{formatPrice(extra.price * item.quantity)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-2 flex justify-between text-lg font-black text-gray-900">
                <span>Gesamt</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>

            <div className="space-y-3 pb-5">
              {getNextStatus(selectedOrder.status) && (
                <button
                  onClick={() => handleStatusTransition(selectedOrder.id, selectedOrder.status)}
                  className="w-full flex items-center justify-center gap-2 py-5 bg-[#06c167] text-white rounded-2xl text-lg font-black shadow-lg shadow-green-100 active:scale-95 transition-transform"
                >
                  <CheckCircle size={22} />
                  {getStatusLabel(getNextStatus(selectedOrder.status)!)}
                </button>
              )}
              <button
                onClick={() => handlePrint(selectedOrder)}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-gray-100 text-gray-700 rounded-2xl font-bold active:bg-gray-50"
              >
                <Printer size={18} />
                Bon drucken
              </button>
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <button
                  onClick={() => cancelOrder(selectedOrder.id)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl font-bold active:bg-red-100"
                >
                  <XCircle size={18} />
                  Stornieren
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => { setIsCancelConfirmOpen(false); setOrderToCancel(null) }}
        onConfirm={performCancel}
        title="Bestellung stornieren?"
        message="Möchtest du diese Bestellung wirklich stornieren? Der Kunde wird per E-Mail benachrichtigt."
        confirmText="Ja, stornieren"
        cancelText="Abbrechen"
        isDangerous={true}
      />

      <Modal 
        isOpen={isTimeModalOpen} 
        onClose={() => setIsTimeModalOpen(false)}
        title="Lieferzeit wählen"
        className="z-[9999]"
      >
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500 mb-6 font-medium">Wie lange dauert die Lieferung voraussichtlich? Der Kunde wird per E-Mail informiert.</p>
          <div className="grid grid-cols-2 gap-4">
            {[15, 30, 45, 60, 75, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => {
                  if (pendingConfirmId) updateStatus(pendingConfirmId, 'confirmed', mins)
                  setIsTimeModalOpen(false)
                  setPendingConfirmId(null)
                }}
                className="py-6 px-4 rounded-2xl border-2 border-gray-200 bg-white text-2xl font-black text-[#142328] shadow-sm active:bg-gray-100 active:scale-95 transition-all"
              >
                {mins} Min.
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
