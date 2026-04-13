import { supabase } from '@/lib/supabase'
import type { RestaurantSettings } from '@/types'

// Public fetch — uses the restricted view (hides revenue_goal_daily, delivery_zones).
// Called by the customer-facing storefront and unauthenticated pages.
export async function fetchSettings(): Promise<RestaurantSettings> {
  const { data, error } = await supabase
    .from('restaurant_info')   // view — sensitive columns excluded
    .select('*')
    .single()

  if (error) throw error
  return data as RestaurantSettings
}

// Admin fetch — reads the full table including delivery_zones and revenue_goal_daily.
// Only callable with a manager JWT (RLS enforces this on restaurant_settings table).
export async function fetchSettingsAdmin(): Promise<RestaurantSettings> {
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*')
    .single()

  if (error) throw error
  return data as RestaurantSettings
}

export async function updateSettings(id: string, updates: Partial<RestaurantSettings>): Promise<void> {
  const { error } = await supabase
    .from('restaurant_settings')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}
