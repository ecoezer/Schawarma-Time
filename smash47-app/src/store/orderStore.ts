import { create } from 'zustand'
import type { Order } from '@/types'
import * as orderService from '@/services/orderService'
import { handleError } from '@/lib/errorHandler'

// Lazy-initialized to avoid issues in test/non-browser environments
let notificationAudio: HTMLAudioElement | null = null
function getAudio(): HTMLAudioElement {
  return (notificationAudio ??= new Audio('/order-notification.mp3'))
}

interface OrderStore {
  orders: Order[]
  isLoading: boolean
  error: string | null
  soundEnabled: boolean

  fetchOrders: () => Promise<void>
  setSoundEnabled: (enabled: boolean) => void
  initRealtime: (onNewOrder?: (order: Order) => void) => () => void
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

  initRealtime: (onNewOrder) => {
    return orderService.subscribeToOrders((payload) => {
      const { eventType, new: next, old } = payload

      if (eventType === 'INSERT') {
        const order = next as Order
        set(state => ({ orders: [order, ...state.orders] }))
        if (get().soundEnabled) {
          const audio = getAudio()
          audio.currentTime = 0
          audio.play().catch(e => console.warn('Audio play failed:', e))
        }
        onNewOrder?.(order)
      } else if (eventType === 'UPDATE') {
        set(state => ({ orders: state.orders.map(o => o.id === next.id ? next as Order : o) }))
      } else if (eventType === 'DELETE') {
        set(state => ({ orders: state.orders.filter(o => o.id !== old.id) }))
      }
    })
  },
}))
