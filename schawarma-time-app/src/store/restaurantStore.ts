import { create } from 'zustand'
import type { RestaurantSettings } from '@/types'
import * as restaurantService from '@/services/restaurantService'
import { extractMessage } from '@/lib/errorHandler' 

interface RestaurantStore {
  settings: RestaurantSettings | null
  isLoading: boolean
  error: string | null

  fetchSettings: (adminMode?: boolean) => Promise<void>
  updateSettings: (updates: Partial<RestaurantSettings>) => Promise<void>
  toggleDelivery: () => Promise<void>
}

export const useRestaurantStore = create<RestaurantStore>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  fetchSettings: async (adminMode = false) => {
    set({ isLoading: true, error: null })
    try {
      // adminMode=true uses the full table (delivery_zones, revenue_goal_daily visible)
      // adminMode=false (default) uses the restricted public view — no sensitive fields
      const settings = adminMode
        ? await restaurantService.fetchSettingsAdmin()
        : await restaurantService.fetchSettings()
      set({ settings, isLoading: false })
    } catch (err) {
      set({ settings: null, error: extractMessage(err), isLoading: false })
    }
  },

  updateSettings: async (updates) => {
    const current = get().settings
    if (!current) return

    // Optimistic update
    set({ settings: { ...current, ...updates } })

    try {
      await restaurantService.updateSettings(current.id, updates)
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
