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
  patchOrder: (id: string, changes: Partial<Order>) => void
  setSoundEnabled: (enabled: boolean) => void
  checkSound: () => void
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

  patchOrder: (id, changes) =>
    set(state => ({ orders: state.orders.map(o => o.id === id ? { ...o, ...changes } : o) })),

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled })
    get().checkSound()
  },

  checkSound: () => {
    const { orders, soundEnabled } = get()
    const hasPending = orders.some(o => o.status === 'pending')
    const audio = getAudio()
    
    if (hasPending && soundEnabled) {
      audio.loop = true
      audio.play().catch(e => console.warn('Audio play failed:', e))
    } else {
      audio.pause()
      audio.currentTime = 0
    }
  },

  initRealtime: (onNewOrder) => {
    // Initial sound check
    get().checkSound()

    return orderService.subscribeToOrders((payload) => {
      const { eventType, new: next, old } = payload

      if (eventType === 'INSERT') {
        const order = next as Order
        set(state => ({ orders: [order, ...state.orders] }))
        onNewOrder?.(order)
      } else if (eventType === 'UPDATE') {
        orderService.fetchOrderById(next.id).then(full => {
          if (full) {
            set(state => ({ orders: state.orders.map(o => o.id === full.id ? full : o) }))
          }
        })
      } else if (eventType === 'DELETE') {
        set(state => ({ orders: state.orders.filter(o => o.id !== old.id) }))
      }
      
      // Re-check sound after any change
      get().checkSound()
    })
  },
}))
