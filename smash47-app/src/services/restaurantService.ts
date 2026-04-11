import { supabase } from '@/lib/supabase'
import type { RestaurantSettings } from '@/types'

export async function fetchSettings(): Promise<RestaurantSettings> {
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
