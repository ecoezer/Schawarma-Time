import { create } from 'zustand'
import type { Category, Product } from '@/types'
import * as productService from '@/services/productService'
import { handleError } from '@/lib/errorHandler'

interface MenuStore {
  categories: Category[]
  products: Product[]
  isLoading: boolean
  error: string | null

  fetchMenu: () => Promise<void>
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>
  patchProductLocally: (productId: string, updates: Partial<Product>) => void
  createCategory: (name: string, slug: string) => Promise<void>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
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
    } catch (err) {
      const msg = handleError(err, 'Menü laden')
      set({ isLoading: false, error: msg })
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

  createCategory: async (name, slug) => {
    const position = get().categories.length + 1
    const created = await productService.createCategory(name, slug, position)
    set({ categories: [...get().categories, created] })
  },

  updateCategory: async (id, updates) => {
    await productService.updateCategory(id, updates)
    set({
      categories: get().categories.map(c => c.id === id ? { ...c, ...updates } : c)
    })
  },

  deleteCategory: async (id) => {
    await productService.deleteCategory(id)
    set({ categories: get().categories.filter(c => c.id !== id) })
  },
}))
