import { create } from 'zustand'
import type { Order, OrderStatus } from '@/types'
import * as orderService from '@/services/orderService'
import { handleError } from '@/lib/errorHandler'
import toast from 'react-hot-toast'

interface OrderStore {
  orders: Order[]
  isLoading: boolean
  error: string | null
  soundEnabled: boolean

  // Actions
  fetchOrders: () => Promise<void>
  setSoundEnabled: (enabled: boolean) => void

  // Computed-like helpers
  pendingCount: () => number
  activeOrders: () => Order[]

  // Realtime
  initRealtime: () => () => void
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,
  soundEnabled: true,

  fetchOrders: async () => {
    set({ isLoading: true, error: null })
    try {
      const orders = await orderService.fetchAllOrders()
      set({ orders, isLoading: false })
    } catch (err) {
      const msg = handleError(err, 'Bestellungen laden')
      set({ isLoading: false, error: msg })
    }
  },

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  pendingCount: () => get().orders.filter(o => o.status === 'pending').length,
  activeOrders: () => get().orders.filter(o => !['cancelled', 'delivered'].includes(o.status)),

  initRealtime: () => {
    return orderService.subscribeToOrders((payload) => {
      if (payload.eventType === 'INSERT') {
        const newOrder = payload.new as Order
        set(state => ({ orders: [newOrder, ...state.orders] }))

        // Play sound if enabled
        if (get().soundEnabled) {
          const audio = new Audio('/order-notification.mp3')
          audio.play().catch(e => console.warn('Audio play failed:', e))
        }
        toast.success(`Neue Bestellung: ${newOrder.order_number}`)
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as Order
        set(state => ({
          orders: state.orders.map(o => o.id === updated.id ? updated : o)
        }))
      } else if (payload.eventType === 'DELETE') {
        set(state => ({
          orders: state.orders.filter(o => o.id !== payload.old.id)
        }))
      }
    })
  },
}))
