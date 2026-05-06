import { collection, doc, getDocs, limit, query, setDoc, updateDoc } from 'firebase/firestore'
import { db, withFirebaseTimeout } from '@/lib/firebase'
import type { RestaurantSettings } from '@/types'

const DEFAULT_SETTINGS: RestaurantSettings = {
  id: 'default',
  name: 'Schawarma-Time',
  description: '',
  address: '',
  phone: '05069 8067500',
  email: '',
  logo_url: null,
  hero_images: [],
  rating: 0,
  review_count: 0,
  is_delivery_active: true,
  delivery_fee: 0,
  min_order_amount: 15,
  estimated_delivery_time: 35,
  delivery_radius_km: 0,
  delivery_zones: [],
  hours: {},
  is_halal_certified: false,
  announcement: null,
  is_announcement_active: false,
  is_map_mode_active: false,
  is_hero_active: true,
  is_search_active: true,
  revenue_goal_daily: 0,
  tags: [],
  payment_methods: {
    cash: true,
    card_on_delivery: true,
  },
}

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
    name: data.name ?? DEFAULT_SETTINGS.name,
    description: data.description ?? DEFAULT_SETTINGS.description,
    address: data.address ?? DEFAULT_SETTINGS.address,
    phone: data.phone ?? DEFAULT_SETTINGS.phone,
    email: data.email ?? DEFAULT_SETTINGS.email,
    logo_url: data.logo_url ?? DEFAULT_SETTINGS.logo_url,
    hero_images: Array.isArray(data.hero_images) ? data.hero_images : DEFAULT_SETTINGS.hero_images,
    rating: data.rating ?? DEFAULT_SETTINGS.rating,
    review_count: data.review_count ?? DEFAULT_SETTINGS.review_count,
    is_delivery_active: data.is_delivery_active ?? DEFAULT_SETTINGS.is_delivery_active,
    delivery_fee: data.delivery_fee ?? DEFAULT_SETTINGS.delivery_fee,
    min_order_amount: data.min_order_amount ?? DEFAULT_SETTINGS.min_order_amount,
    estimated_delivery_time: data.estimated_delivery_time ?? DEFAULT_SETTINGS.estimated_delivery_time,
    delivery_radius_km: data.delivery_radius_km ?? DEFAULT_SETTINGS.delivery_radius_km,
    delivery_zones: Array.isArray(data.delivery_zones) ? data.delivery_zones : DEFAULT_SETTINGS.delivery_zones,
    hours: data.hours ?? DEFAULT_SETTINGS.hours,
    is_halal_certified: data.is_halal_certified ?? DEFAULT_SETTINGS.is_halal_certified,
    announcement: data.announcement ?? DEFAULT_SETTINGS.announcement,
    is_announcement_active: data.is_announcement_active ?? DEFAULT_SETTINGS.is_announcement_active,
    is_map_mode_active: data.is_map_mode_active ?? DEFAULT_SETTINGS.is_map_mode_active,
    is_hero_active: data.is_hero_active ?? DEFAULT_SETTINGS.is_hero_active,
    is_search_active: data.is_search_active ?? DEFAULT_SETTINGS.is_search_active,
    revenue_goal_daily: data.revenue_goal_daily ?? DEFAULT_SETTINGS.revenue_goal_daily,
    tags: Array.isArray(data.tags) ? data.tags : DEFAULT_SETTINGS.tags,
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
    return DEFAULT_SETTINGS
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
