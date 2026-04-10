import { create } from 'zustand'
import type { Category, Product } from '@/types'
import * as productService from '@/services/productService'

interface MenuStore {
  categories: Category[]
  products: Product[]
  isLoading: boolean
  error: string | null

  fetchMenu: () => Promise<void>
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>
  patchProductLocally: (productId: string, updates: Partial<Product>) => void
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  categories: [],
  products: [],
  isLoading: false,
  error: null,

  fetchMenu: async () => {
    set({ isLoading: true, error: null })
    try {
      const [categories, products] = await Promise.all([
        productService.fetchCategories(),
        productService.fetchProducts(),
      ])
      set({ categories, products, isLoading: false, error: null })
    } catch (err: any) {
      console.error('[menuStore] fetchMenu error:', err)
      set({ isLoading: false, error: err.message || 'Unbekannter Fehler' })
    }
  },

  updateProduct: async (productId, updates) => {
    const currentProds = get().products
    // Optimistic update
    set({
      products: currentProds.map(p => p.id === productId ? { ...p, ...updates } : p)
    })

    try {
      await productService.updateProduct(productId, updates)
    } catch (err) {
      // Revert if service call fails
      set({ products: currentProds, error: (err as Error).message })
    }
  },

  // Local-only patch — no DB call, no revert risk
  patchProductLocally: (productId, updates) => {
    set({
      products: get().products.map(p => p.id === productId ? { ...p, ...updates } : p)
    })
  },
}))
