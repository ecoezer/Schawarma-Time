import { useState, useMemo, useEffect, memo } from 'react'
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
import { SunmiPrinter } from '@kduma-autoid/capacitor-sunmi-printer'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed']

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// MEMOIZED ORDER CARD FOR PERFORMANCE
const OrderCard = memo(({ order, isSelected, onClick }: { order: Order, isSelected: boolean, onClick: () => void }) => {
  const isPending = order.status === 'pending'
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-4 shadow-sm border-2 cursor-pointer transition-all active:scale-[0.98]",
        isSelected ? 'border-[#142328]' : 'border-transparent',
        isPending ? 'border-l-8 border-l-yellow-400 ring-1 ring-yellow-400/10' : ''
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-black text-lg text-[#142328]">{order.order_number.replace('S47', 'ST')}</span>
          {isPending && (
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          )}
        </div>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-lg font-black tracking-wider uppercase", getStatusColor(order.status))}>
          {order.status === 'confirmed' ? 'BESTÄTIGT' : getStatusLabel(order.status)}
        </span>
      </div>
      
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">{order.customer_name}</p>
          <p className="text-[11px] font-bold text-gray-400 leading-none mt-0.5">{order.customer_phone}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {order.delivery_address === 'Selbstabholung' ? (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-black flex items-center gap-1">
                🏠 SELBSTABHOLUNG
              </span>
            ) : (
              <p className="text-xs text-gray-500 truncate">{order.delivery_address}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-black text-[#142328] text-lg leading-none">{formatPrice(order.total)}</p>
          <span className="text-[10px] text-gray-400 font-bold flex items-center justify-end gap-1 mt-1">
            <Clock size={10} />
            {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
})

export function AdminOrders() {
  const orders = useOrderStore(state => state.orders)
  const isLoading = useOrderStore(state => state.isLoading)
  const error = useOrderStore(state => state.error)
  const { soundEnabled, setSoundEnabled, fetchOrders, patchOrder, initRealtime } = useOrderStore()

  useEffect(() => {
    fetchOrders()
    const unsubscribe = initRealtime()
    return () => unsubscribe()
  }, [fetchOrders, initRealtime])

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

  const isPosMode = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()

  const statusCounts = useMemo(() => orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {} as Record<string, number>), [orders])

  const filteredOrders = useMemo(() => 
    filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  , [orders, filter])

  const printOrderToSunmi = async (order: Order, deliveryTimeMins?: number) => {
    if (!Capacitor.isNativePlatform()) return

    try {
      const printLine = async (text: string, fontSize?: number) => {
        await SunmiPrinter.setAlignment({ alignment: 1 as any })
        if (fontSize) await SunmiPrinter.setFontSize({ size: fontSize })
        await SunmiPrinter.printText({ text: text })
        await SunmiPrinter.lineWrap({ lines: 1 })
      }

      await SunmiPrinter.printerInit()
      await SunmiPrinter.setBold({ enable: true })
      
      await printLine("SCHAWARMA-TIME", 38)
      await printLine("www.schawarma-time.de", 25)
      await printLine("----------", 30)
      
      const orderNum = order.order_number.replace('S47', 'ST')
      await printLine(orderNum, 30)
      await SunmiPrinter.lineWrap({ lines: 1 })
      
      await printLine(order.customer_name, 30)
      await SunmiPrinter.lineWrap({ lines: 1 }) 
      
      const addrLines = order.delivery_address.split(',').map(s => s.trim())
      if (addrLines.length >= 2) {
        await printLine(addrLines[0], 30)
        await printLine(addrLines.slice(1).join(', '), 30)
      } else {
        await printLine(order.delivery_address, 30)
      }
      
      await printLine("----------", 30)
      
      let itemsTotal = 0
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          itemsTotal += (item.unit_price || 0) * item.quantity
          await printLine(`${item.quantity}x ${item.product_name}`, 30)
          if (item.extras && item.extras.length > 0) {
            for (const extra of item.extras) {
              await printLine(`+ ${extra.name}`, 24)
            }
          }
        }
      }
      
      await printLine("----------", 30)
      await printLine(`Zwischensumme: ${formatPrice(itemsTotal)}`, 30)
      
      const deliveryFee = (order as any).delivery_fee || 0
      if (deliveryFee > 0) {
        await printLine(`Lieferkosten: ${formatPrice(deliveryFee)}`, 30)
      }
      
      await printLine(`GESAMT: ${formatPrice(order.total)}`, 40)
      await printLine("----------", 30)
      
      if (order.notes) {
        await printLine("ANWEISUNGEN:", 30)
        await printLine(order.notes, 28)
        await printLine("----------", 30)
      }
      
      const mins = deliveryTimeMins || order.estimated_delivery_time || 0
      if (mins > 0) {
        const now = new Date()
        const deliveryDate = new Date(now.getTime() + (mins * 60000))
        await printLine("LIEFERZEIT (CA.):", 30)
        const timeStr = deliveryDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false })
        await printLine(timeStr, 54)
        await printLine("Vielen Dank!", 28)
      }
      
      await SunmiPrinter.lineWrap({ lines: 4 })
      await SunmiPrinter.cutPaper().catch(() => {})
    } catch (e) {
      console.error('Print Error:', e)
      toast.error('Druckfehler!')
    }
  }

  const updateStatus = async (orderId: string, status: OrderStatus, deliveryTime?: number) => {
    patchOrder(orderId, { status, ...(deliveryTime !== undefined ? { estimated_delivery_time: deliveryTime } : {}) })
    try {
      await orderService.updateOrderStatus(orderId, status, deliveryTime)
      toast.success(`Status: ${getStatusLabel(status)}`)
    } catch (err) {
      handleError(err, 'Status Error')
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

  const handleTimeSelected = (mins: number) => {
    if (!pendingConfirmId) return
    const order = orders.find(o => o.id === pendingConfirmId)
    if (order) printOrderToSunmi(order, mins)
    updateStatus(pendingConfirmId, 'confirmed', mins)
    setIsTimeModalOpen(false)
    setPendingConfirmId(null)
    setSelectedOrderId(null)
    toast.success('Bestellung bestätigt!')
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full relative bg-gray-50">
      <div className={cn("flex-1 min-w-0 p-4", selectedOrder ? "hidden lg:block" : "block")}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-gray-900">Bestellungen</h1>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 bg-white rounded-xl shadow-sm">
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sticky top-14 z-10 bg-gray-50/95 backdrop-blur-md py-2">
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-2 rounded-xl text-[11px] font-black whitespace-nowrap shadow-sm transition-all uppercase tracking-tighter",
                filter === s 
                  ? 'bg-[#142328] text-white ring-2 ring-[#142328]/10' 
                  : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'
              )}
            >
              {s === 'all' ? 'Alle' : s === 'confirmed' ? 'Bestätigt' : getStatusLabel(s)}
              {statusCounts[s] > 0 && s !== 'all' && (
                <span className={cn("ml-2 px-1.5 py-0.5 rounded-lg text-[10px]", filter === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400')}>
                  {statusCounts[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3 pb-20">
          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Lädt...</div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                isSelected={selectedOrderId === order.id}
                onClick={() => setSelectedOrderId(order.id)}
              />
            ))
          )}
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col p-0">
          <div className="flex items-center justify-between p-5 border-b-2 border-gray-50">
            <button 
              type="button"
              onClick={() => setSelectedOrderId(null)}
              className="flex items-center gap-2 text-base font-black text-[#142328]"
            >
              <ChevronLeft size={24} />
              ZURÜCK
            </button>
            <span className="font-black text-gray-400 text-sm">{selectedOrder.order_number.replace('S47', 'ST')}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 pb-56">
            <div className="bg-gray-50 rounded-3xl p-5 mb-6">
              <p className="font-black text-xl mb-1 text-[#142328]">{selectedOrder.customer_name}</p>
              <p className="text-gray-500 font-bold mb-2">{selectedOrder.customer_phone}</p>
              {selectedOrder.delivery_address === 'Selbstabholung' ? (
                <div className="bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-2 mb-3">
                  🏠 KUNDE HOLT AB (SELBSTABHOLUNG)
                </div>
              ) : (
                <p className="text-gray-600 leading-snug">{selectedOrder.delivery_address}</p>
              )}
              {selectedOrder.notes && (
                <div className="mt-4 p-4 bg-yellow-100 text-yellow-900 rounded-2xl text-sm font-bold">
                  {selectedOrder.notes}
                </div>
              )}
            </div>

            <div className="space-y-4 mb-8">
              {selectedOrder.items?.map((item, i) => (
                <div key={i} className="pb-4 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between font-black text-[#142328]">
                    <span>{item.quantity}× {item.product_name}</span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </div>
                  {item.extras?.map((extra, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-gray-500 font-bold pl-4 mt-1">
                      <span>+ {extra.name}</span>
                      {extra.price > 0 && <span>{formatPrice(extra.price * item.quantity)}</span>}
                    </div>
                  ))}
                </div>
              ))}
              <div className="pt-4 flex justify-between text-2xl font-black text-[#142328] border-t-2 border-gray-100">
                <span>GESAMT</span>
                <span>{formatPrice(selectedOrder.total || 0)}</span>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t-2 border-gray-50 flex flex-col gap-3">
            {isPosMode ? (
              selectedOrder.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(selectedOrder.id, selectedOrder.status)}
                    className="w-full flex items-center justify-center gap-3 py-6 bg-[#06c167] text-white rounded-3xl text-xl font-black shadow-xl shadow-green-100"
                  >
                    <CheckCircle size={24} />
                    BESTÄTIGEN
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelOrder(selectedOrder.id)}
                    className="w-full flex items-center justify-center gap-2 py-5 bg-red-50 text-red-600 rounded-2xl font-black"
                  >
                    <XCircle size={20} />
                    STORNO / ABLEHNEN
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="w-full py-4 bg-gray-100 text-[#142328] rounded-2xl text-center font-black">
                    BESTELLUNG BESTÄTIGT
                  </div>
                  <button
                    type="button"
                    onClick={() => printOrderToSunmi(selectedOrder)}
                    className="w-full flex items-center justify-center gap-2 py-6 bg-[#142328] text-white rounded-3xl font-black"
                  >
                    <Printer size={24} />
                    DRUCKEN
                  </button>
                </div>
              )
            ) : (
              <>
                {getNextStatus(selectedOrder.status) && (
                  <button
                    type="button"
                    onClick={() => handleStatusTransition(selectedOrder.id, selectedOrder.status)}
                    className="w-full flex items-center justify-center gap-3 py-6 bg-[#06c167] text-white rounded-3xl text-xl font-black shadow-xl shadow-green-100"
                  >
                    <CheckCircle size={24} />
                    {getStatusLabel(getNextStatus(selectedOrder.status)!)}
                  </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => printOrderToSunmi(selectedOrder)}
                    className="flex items-center justify-center gap-2 py-5 bg-gray-100 text-gray-700 rounded-2xl font-black"
                  >
                    <Printer size={20} />
                    BON
                  </button>
                  {selectedOrder.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => cancelOrder(selectedOrder.id)}
                      className="flex items-center justify-center gap-2 py-5 bg-red-50 text-red-600 rounded-2xl font-black"
                    >
                      <XCircle size={20} />
                      STORNO
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isTimeModalOpen} onClose={() => setIsTimeModalOpen(false)} title="Lieferzeit">
        <div className="p-5 grid grid-cols-2 gap-4">
          {[15, 30, 45, 60, 75, 90].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => handleTimeSelected(mins)}
              className="py-8 bg-white border-4 border-gray-100 rounded-3xl text-3xl font-black text-[#142328] active:bg-[#142328] active:text-white"
            >
              {mins}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={performCancel}
        title="Stornieren?"
        message="Bist du sicher, dass du diese Bestellung stornieren möchtest?"
      />
    </div>
  )
}
