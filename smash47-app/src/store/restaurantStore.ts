import { create } from 'zustand'
import type { RestaurantSettings } from '@/types'
import { supabase } from '@/lib/supabase'

interface RestaurantStore {
  settings: RestaurantSettings | null
  isLoading: boolean
  error: string | null

  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<RestaurantSettings>) => Promise<void>
  toggleDelivery: () => Promise<void>
}

export const useRestaurantStore = create<RestaurantStore>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .single()

      if (error) throw error
      set({ settings: data as RestaurantSettings, isLoading: false })
    } catch (err: any) {
      set({ settings: null, error: err.message, isLoading: false })
    }
  },

  updateSettings: async (updates) => {
    const current = get().settings
    if (!current) return

    // Optimistic update
    set({ settings: { ...current, ...updates } })

    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .update(updates)
        .eq('id', current.id)

      if (error) {
        // Revert on error
        set({ settings: current })
        throw error
      }
    } catch (err) {
      set({ settings: current, error: (err as Error).message })
    }
  },

  toggleDelivery: async () => {
    const current = get().settings
    if (!current) return
    await get().updateSettings({ is_delivery_active: !current.is_delivery_active })
  },
}))
