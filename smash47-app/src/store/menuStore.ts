import { create } from 'zustand'
import type { Category, Product } from '@/types'
import { supabase } from '@/lib/supabase'

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
      const [catResult, prodResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('position'),
        supabase
          .from('products')
          .select('*')
          .order('position')
      ])

      if (catResult.error) throw catResult.error
      if (prodResult.error) throw prodResult.error

      set({
        categories: (catResult.data || []) as Category[],
        products: (prodResult.data || []) as Product[],
        isLoading: false,
        error: null,
      })
    } catch (err: any) {
      console.error('[Smash47] fetchMenu error:', err)
      set({
        isLoading: false,
        error: err.message || 'Unbekannter Fehler',
      })
    }
  },

  updateProduct: async (productId, updates) => {
    const currentProds = get().products
    // Optimistic update
    set({
      products: currentProds.map((p) => p.id === productId ? { ...p, ...updates } : p)
    })

    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)

      if (error) throw error
    } catch (err) {
      // Revert if Supabase call fails
      set({ products: currentProds, error: (err as Error).message })
    }
  },

  // Local-only patch — no Supabase call, no revert risk
  // Use this when the Supabase write was already done separately (e.g. in handleSave)
  patchProductLocally: (productId, updates) => {
    set({
      products: get().products.map((p) => p.id === productId ? { ...p, ...updates } : p)
    })
  },
}))
