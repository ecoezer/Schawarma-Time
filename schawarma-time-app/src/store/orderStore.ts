import { create } from 'zustand'
import type { Order } from '@/types'
import * as orderService from '@/services/orderService'
import { handleError } from '@/lib/errorHandler'

import { soundService } from '@/services/soundService'

interface OrderStore {
  orders: Order[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  soundEnabled: boolean
  page: number
  hasMore: boolean

  fetchOrders: (page?: number) => Promise<void>
  patchOrder: (id: string, changes: Partial<Order>) => void
  setSoundEnabled: (enabled: boolean) => void
  checkSound: () => void
  initRealtime: (onNewOrder?: (order: Order) => void) => () => void
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  soundEnabled: true,
  page: 0,
  hasMore: false,

  fetchOrders: async (page = 0) => {
    const isFirstPage = page === 0
    set({
      ...(isFirstPage ? { isLoading: true } : { isLoadingMore: true }),
      error: null,
    })
    try {
      const { data, hasMore } = await orderService.fetchAllOrders(page)
      set(state => ({
        orders: isFirstPage ? data : [...state.orders, ...data],
        isLoading: false,
        isLoadingMore: false,
        page,
        hasMore,
      }))
    } catch (err) {
      const msg = handleError(err, 'Bestellungen laden')
      set({ isLoading: false, isLoadingMore: false, error: msg })
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
    
    if (hasPending && soundEnabled) {
      soundService.startNotification()
    } else {
      soundService.stopNotification()
    }
  },

  initRealtime: (onNewOrder) => {
    // Initial sound check
    get().checkSound()

    return orderService.subscribeToOrders((payload) => {
      const { eventType, new: next, old } = payload

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const nextOrder = next as Order
        set(state => {
          const exists = state.orders.some(o => o.id === nextOrder.id)
          if (exists) {
            return { orders: state.orders.map(o => o.id === nextOrder.id ? { ...o, ...nextOrder } : o) }
          }
          return { orders: [nextOrder, ...state.orders] }
        })
        if (eventType === 'INSERT') onNewOrder?.(nextOrder)
        get().checkSound()
      } else if (eventType === 'DELETE') {
        set(state => ({ orders: state.orders.filter(o => o.id !== old.id) }))
      }
      
      // Re-check sound after any change
      get().checkSound()
    })
  },
}))
