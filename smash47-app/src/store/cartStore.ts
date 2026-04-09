import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, CartExtra } from '@/types'
import { generateId } from '@/lib/utils'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  globalNote: string

  // Actions
  addItem: (item: Omit<CartItem, 'id' | 'total'>) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  setGlobalNote: (note: string) => void

  // Computed
  totalItems: () => number
  totalPrice: () => number
  itemCount: () => number
}

const calculateItemTotal = (price: number, extras: CartExtra[], quantity: number): number => {
  const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0)
  return (price + extrasTotal) * quantity
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      globalNote: '',

      addItem: (item) => {
        const id = generateId()
        const total = calculateItemTotal(item.price, item.selected_extras, item.quantity)
        set((state) => ({
          items: [...state.items, { ...item, id, total }],
          isOpen: true,
        }))
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

      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: () => get().items.reduce((sum, item) => sum + item.total, 0),
      itemCount: () => get().items.length,
    }),
    {
      name: 'smash47-cart',
      partialize: (state) => ({ items: state.items, globalNote: state.globalNote }),
    }
  )
)
