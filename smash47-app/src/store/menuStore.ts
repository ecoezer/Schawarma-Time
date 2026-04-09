import { create } from 'zustand'
import type { Category, Product } from '@/types'
import { supabase } from '@/lib/supabase'
import { mockCategories, mockProducts } from '@/data/mockData'

interface MenuStore {
  categories: Category[]
  products: Product[]
  isLoading: boolean
  error: string | null

  fetchMenu: () => Promise<void>
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  categories: mockCategories,
  products: mockProducts,
  isLoading: false,
  error: null,

  fetchMenu: async () => {
    set({ isLoading: true, error: null })
    console.time('[Smash47] fetchMenu total')
    try {
      // Race: Supabase queries vs 5-second timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timeout (5s) — using mock data')), 5000)
      )

      console.time('[Smash47] supabase queries')
      const [catResult, prodResult] = await Promise.race([
        Promise.all([
          supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('position'),
          supabase
            .from('products')
            .select('*')
            .order('position')
        ]),
        timeoutPromise
      ]) as [any, any]
      console.timeEnd('[Smash47] supabase queries')

      if (catResult.error) throw catResult.error
      if (prodResult.error) throw prodResult.error

      const cats = catResult.data
      const prods = prodResult.data

      // Only use Supabase data if BOTH categories AND products have data
      if (cats && prods && cats.length > 0 && prods.length > 0) {
        console.log(`[Smash47] Loaded ${cats.length} categories, ${prods.length} products from Supabase`)
        set({ 
          categories: cats as Category[], 
          products: prods as Product[], 
          isLoading: false 
        })
        console.timeEnd('[Smash47] fetchMenu total')
        return
      }

      // Supabase returned empty — tables probably not seeded
      console.warn('[Smash47] Supabase returned empty data, using mock data')
      set({ 
        categories: mockCategories, 
        products: mockProducts, 
        isLoading: false 
      })
      console.timeEnd('[Smash47] fetchMenu total')
    } catch (err) {
      console.warn('[Smash47] Supabase fetch failed, using mock data. Reason:', err)
      console.timeEnd('[Smash47] fetchMenu total')
      set({ 
        categories: mockCategories, 
        products: mockProducts, 
        isLoading: false 
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
  }
}))
