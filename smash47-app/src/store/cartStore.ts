import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartExtra, RestaurantSettings } from '@/types'
import { generateId, isRestaurantOpen } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  globalNote: string

  // Actions — settings passed as parameter, no cross-store coupling
  addItem: (item: Omit<CartItem, 'id' | 'total'>, settings?: RestaurantSettings | null) => boolean
  addItems: (items: Omit<CartItem, 'id' | 'total'>[], settings?: RestaurantSettings | null) => boolean
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  setGlobalNote: (note: string) => void

  // Computed
  totalQuantity: () => number
  totalPrice: () => number
  lineItemCount: () => number
}

const calculateItemTotal = (price: number, extras: CartExtra[], quantity: number): number => {
  const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0)
  return (price + extrasTotal) * quantity
}

function isStoreOpen(settings?: RestaurantSettings | null): boolean {
  if (!settings) return true // If no settings loaded yet, allow
  return isRestaurantOpen(settings.hours) && settings.is_delivery_active
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      globalNote: '',

      addItem: (item, settings) => {
        if (!isStoreOpen(settings)) {
          toast.error('Wir haben aktuell geschlossen oder nehmen keine Bestellungen an.')
          return false
        }

        const id = generateId()
        const total = calculateItemTotal(item.price, item.selected_extras, item.quantity)
        set((state) => ({
          items: [...state.items, { ...item, id, total }],
          isOpen: true,
        }))
        return true
      },

      addItems: (newItems, settings) => {
        if (!isStoreOpen(settings)) {
          toast.error('Wir haben aktuell geschlossen oder nehmen keine Bestellungen an.')
          return false
        }

        const itemsWithIds = newItems.map(item => ({
          ...item,
          id: generateId(),
          total: calculateItemTotal(item.price, item.selected_extras, item.quantity)
        }))
        set((state) => ({
          items: [...state.items, ...itemsWithIds],
          isOpen: true,
        }))
        return true
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== cartItemId),
        }))
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId
              ? { ...item, quantity, total: calculateItemTotal(item.price, item.selected_extras, quantity) }
              : item
          ),
        }))
      },

      clearCart: () => set({ items: [], globalNote: '' }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setGlobalNote: (note) => set({ globalNote: note }),

      totalQuantity: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: () => get().items.reduce((sum, item) => sum + item.total, 0),
      lineItemCount: () => get().items.length,
    }),
    {
      name: 'smash47-cart',
      partialize: (state) => ({ items: state.items, globalNote: state.globalNote }),
    }
  )
)
