import { collection, doc, getDocs, limit, query, setDoc, updateDoc } from 'firebase/firestore'
import { db, withFirebaseTimeout } from '@/lib/firebase'
import type { RestaurantSettings } from '@/types'

function normalizePaymentMethods(value: unknown): RestaurantSettings['payment_methods'] {
  const methods = value as Partial<RestaurantSettings['payment_methods']> | null | undefined
  return {
    cash: methods?.cash ?? true,
    card_on_delivery: methods?.card_on_delivery ?? true,
  }
}

function normalizeSettings(id: string, data: Partial<RestaurantSettings>): RestaurantSettings {
  return {
    id,
    name: data.name ?? 'Schawarma-Time',
    description: data.description ?? '',
    address: data.address ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
    logo_url: data.logo_url ?? null,
    hero_images: Array.isArray(data.hero_images) ? data.hero_images : [],
    rating: data.rating ?? 0,
    review_count: data.review_count ?? 0,
    is_delivery_active: data.is_delivery_active ?? true,
    delivery_fee: data.delivery_fee ?? 0,
    min_order_amount: data.min_order_amount ?? 15,
    estimated_delivery_time: data.estimated_delivery_time ?? 35,
    delivery_radius_km: data.delivery_radius_km ?? 0,
    delivery_zones: Array.isArray(data.delivery_zones) ? data.delivery_zones : [],
    hours: data.hours ?? {},
    is_halal_certified: data.is_halal_certified ?? false,
    announcement: data.announcement ?? null,
    is_announcement_active: data.is_announcement_active ?? false,
    is_map_mode_active: data.is_map_mode_active ?? false,
    is_hero_active: data.is_hero_active ?? true,
    is_search_active: data.is_search_active ?? true,
    revenue_goal_daily: data.revenue_goal_daily ?? 0,
    tags: Array.isArray(data.tags) ? data.tags : [],
    payment_methods: normalizePaymentMethods(data.payment_methods),
  }
}

async function getSettingsDoc(): Promise<RestaurantSettings> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'restaurant_settings'), limit(1))),
    'Restaurant-Einstellungen laden',
  )
  const first = snap.docs[0]
  if (!first) {
    throw new Error('Keine Restaurant-Einstellungen gefunden.')
  }
  return normalizeSettings(first.id, first.data() as Partial<RestaurantSettings>)
}

export async function fetchSettings(): Promise<RestaurantSettings> {
  return getSettingsDoc()
}

export async function fetchSettingsAdmin(): Promise<RestaurantSettings> {
  return getSettingsDoc()
}

export async function updateSettings(id: string, updates: Partial<RestaurantSettings>): Promise<void> {
  await setDoc(doc(db, 'restaurant_settings', id), updates as Record<string, unknown>, { merge: true })
}
