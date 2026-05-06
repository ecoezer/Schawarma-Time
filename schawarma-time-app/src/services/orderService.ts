import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db, withFirebaseTimeout } from '@/lib/firebase'
import type { Order, OrderStatus, OrderItem, PaymentMethod, Product, RestaurantSettings } from '@/types'
import { generateOrderNumber } from '@/lib/utils'
import { incrementCustomerOrderStats } from '@/services/authService'
import { validateCoupon } from '@/services/couponService'

export interface CreateOrderInput {
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_address: string
  items: { product_id: string; quantity: number; extras?: OrderItem['extras']; note?: string }[]
  coupon_code: string | null
  payment_method: PaymentMethod
  notes: string | null
}

export interface CreateOrderResult {
  id: string
  order_number: string
}

export interface PaginatedOrdersResult {
  data: Order[]
  hasMore: boolean
}

const ADMIN_ORDERS_PAGE_SIZE = 50
const DEFAULT_RESTAURANT_SETTINGS: RestaurantSettings = {
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

function mapOrder(id: string, data: Partial<Order>): Order {
  return {
    id,
    order_number: data.order_number ?? '',
    user_id: data.user_id ?? null,
    customer_name: data.customer_name ?? '',
    customer_phone: data.customer_phone ?? '',
    customer_email: data.customer_email ?? '',
    delivery_address: data.delivery_address ?? '',
    delivery_lat: data.delivery_lat ?? null,
    delivery_lng: data.delivery_lng ?? null,
    items: Array.isArray(data.items) ? data.items : [],
    subtotal: data.subtotal ?? 0,
    delivery_fee: data.delivery_fee ?? 0,
    discount_amount: data.discount_amount ?? 0,
    coupon_code: data.coupon_code ?? null,
    total: data.total ?? 0,
    status: data.status ?? 'pending',
    payment_method: data.payment_method ?? 'cash',
    estimated_delivery_time: data.estimated_delivery_time ?? null,
    notes: data.notes ?? null,
    rejection_reason: data.rejection_reason ?? null,
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? new Date().toISOString(),
  }
}

async function fetchAllOrdersRaw(): Promise<Order[]> {
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc')))
  return snap.docs.map((item) => mapOrder(item.id, item.data() as Partial<Order>))
}

async function fetchRestaurantSettings(): Promise<RestaurantSettings> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'restaurant_settings'), limit(1))),
    'Restaurant-Einstellungen für Bestellung laden',
  )
  const docSnap = snap.docs[0]
  if (!docSnap) return DEFAULT_RESTAURANT_SETTINGS
  const data = docSnap.data() as Partial<RestaurantSettings>
  return {
    id: docSnap.id,
    name: data.name ?? DEFAULT_RESTAURANT_SETTINGS.name,
    description: data.description ?? DEFAULT_RESTAURANT_SETTINGS.description,
    address: data.address ?? DEFAULT_RESTAURANT_SETTINGS.address,
    phone: data.phone ?? DEFAULT_RESTAURANT_SETTINGS.phone,
    email: data.email ?? DEFAULT_RESTAURANT_SETTINGS.email,
    logo_url: data.logo_url ?? DEFAULT_RESTAURANT_SETTINGS.logo_url,
    hero_images: Array.isArray(data.hero_images) ? data.hero_images : DEFAULT_RESTAURANT_SETTINGS.hero_images,
    rating: data.rating ?? DEFAULT_RESTAURANT_SETTINGS.rating,
    review_count: data.review_count ?? DEFAULT_RESTAURANT_SETTINGS.review_count,
    is_delivery_active: data.is_delivery_active ?? DEFAULT_RESTAURANT_SETTINGS.is_delivery_active,
    delivery_fee: data.delivery_fee ?? DEFAULT_RESTAURANT_SETTINGS.delivery_fee,
    min_order_amount: data.min_order_amount ?? DEFAULT_RESTAURANT_SETTINGS.min_order_amount,
    estimated_delivery_time: data.estimated_delivery_time ?? DEFAULT_RESTAURANT_SETTINGS.estimated_delivery_time,
    delivery_radius_km: data.delivery_radius_km ?? DEFAULT_RESTAURANT_SETTINGS.delivery_radius_km,
    delivery_zones: Array.isArray(data.delivery_zones) ? data.delivery_zones : DEFAULT_RESTAURANT_SETTINGS.delivery_zones,
    hours: data.hours ?? DEFAULT_RESTAURANT_SETTINGS.hours,
    is_halal_certified: data.is_halal_certified ?? DEFAULT_RESTAURANT_SETTINGS.is_halal_certified,
    announcement: data.announcement ?? DEFAULT_RESTAURANT_SETTINGS.announcement,
    is_announcement_active: data.is_announcement_active ?? DEFAULT_RESTAURANT_SETTINGS.is_announcement_active,
    is_map_mode_active: data.is_map_mode_active ?? DEFAULT_RESTAURANT_SETTINGS.is_map_mode_active,
    is_hero_active: data.is_hero_active ?? DEFAULT_RESTAURANT_SETTINGS.is_hero_active,
    is_search_active: data.is_search_active ?? DEFAULT_RESTAURANT_SETTINGS.is_search_active,
    revenue_goal_daily: data.revenue_goal_daily ?? DEFAULT_RESTAURANT_SETTINGS.revenue_goal_daily,
    tags: Array.isArray(data.tags) ? data.tags : DEFAULT_RESTAURANT_SETTINGS.tags,
    payment_methods: {
      cash: data.payment_methods?.cash ?? DEFAULT_RESTAURANT_SETTINGS.payment_methods.cash,
      card_on_delivery: data.payment_methods?.card_on_delivery ?? DEFAULT_RESTAURANT_SETTINGS.payment_methods.card_on_delivery,
    },
  }
}

async function fetchProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  const all = await getDocs(collection(db, 'products'))
  const map = new Map<string, Product>()
  all.docs.forEach((item) => {
    if (!ids.includes(item.id)) return
    map.set(item.id, item.data() as Product)
  })
  return map
}

export async function fetchAllOrders(page = 0): Promise<PaginatedOrdersResult> {
  const rows = await fetchAllOrdersRaw()
  const start = page * ADMIN_ORDERS_PAGE_SIZE
  const data = rows.slice(start, start + ADMIN_ORDERS_PAGE_SIZE)
  return { data, hasMore: start + ADMIN_ORDERS_PAGE_SIZE < rows.length }
}

export async function fetchTodayOrders(): Promise<Order[]> {
  const todayPrefix = new Date().toISOString().slice(0, 10)
  const rows = await fetchAllOrdersRaw()
  return rows.filter((order) => order.created_at.startsWith(todayPrefix))
}

export async function fetchUserOrders(): Promise<Order[]> {
  if (!auth.currentUser) return []
  const snap = await getDocs(query(collection(db, 'orders'), where('user_id', '==', auth.currentUser.uid)))
  return snap.docs
    .map((item) => mapOrder(item.id, item.data() as Partial<Order>))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function fetchWeekOrders(): Promise<{ created_at: string; total: number; status: string }[]> {
  const weekAgo = Date.now() - 6 * 24 * 60 * 60 * 1000
  const rows = await fetchAllOrdersRaw()
  return rows
    .filter((order) => new Date(order.created_at).getTime() >= weekAgo && order.status !== 'cancelled')
    .map((order) => ({ created_at: order.created_at, total: order.total, status: order.status }))
}

export async function fetchPendingCount(): Promise<number> {
  const rows = await fetchAllOrdersRaw()
  return rows.filter((order) => order.status === 'pending').length
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, deliveryTime?: number): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updated_at: new Date().toISOString(),
    ...(deliveryTime !== undefined ? { estimated_delivery_time: deliveryTime } : {}),
  })
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const productIds = [...new Set(input.items.map((item) => item.product_id))]
  const [settings, products] = await Promise.all([
    fetchRestaurantSettings(),
    fetchProductsByIds(productIds),
  ])

  const resolvedItems: OrderItem[] = input.items.map((item) => {
    const product = products.get(item.product_id)
    if (!product || !product.is_active) {
      throw new Error(`Produkt nicht verfügbar: ${item.product_id}`)
    }

    const validExtras = (item.extras || []).map((extra) => {
      for (const group of product.extra_groups || []) {
        for (const option of group.extras || []) {
          if (option.id === extra.id) {
            return {
              ...extra,
              price: option.price ?? 0,
              name: option.name ?? extra.name,
              group_name: group.name,
            }
          }
        }
      }
      return { ...extra, price: extra.price ?? 0 }
    })

    const extrasTotal = validExtras.reduce((sum, extra) => sum + extra.price, 0)
    const unitPrice = product.price + extrasTotal
    return {
      product_id: item.product_id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: unitPrice,
      extras: validExtras,
      note: item.note ?? '',
      subtotal: unitPrice * item.quantity,
    }
  })

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0)
  const deliveryFee = input.delivery_address === 'Selbstabholung' ? 0 : (settings.delivery_fee ?? 0)
  const discountCheck = input.coupon_code
    ? await validateCoupon(input.coupon_code, subtotal, auth.currentUser?.uid, input.customer_phone)
    : { valid: false, discount: 0 }
  const discountAmount = discountCheck.valid ? discountCheck.discount : 0
  const total = Math.max(0, subtotal + deliveryFee - discountAmount)
  const orderNumber = generateOrderNumber()
  const now = new Date().toISOString()

  const ref = await addDoc(collection(db, 'orders'), {
    order_number: orderNumber,
    user_id: auth.currentUser?.uid ?? null,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone.replace(/\D/g, ''),
    customer_email: input.customer_email,
    delivery_address: input.delivery_address,
    delivery_lat: null,
    delivery_lng: null,
    items: resolvedItems,
    subtotal,
    delivery_fee: deliveryFee,
    discount_amount: discountAmount,
    coupon_code: discountCheck.valid ? input.coupon_code : null,
    total,
    status: 'pending',
    payment_method: input.payment_method,
    estimated_delivery_time: settings.estimated_delivery_time ?? 35,
    notes: input.notes ?? null,
    rejection_reason: null,
    created_at: now,
    updated_at: now,
  })

  if (auth.currentUser?.uid) {
    await incrementCustomerOrderStats(auth.currentUser.uid)
  }

  if (discountCheck.valid && input.coupon_code) {
    const couponSnap = await getDocs(query(collection(db, 'coupons'), where('code', '==', input.coupon_code.trim().toUpperCase()), limit(1)))
    const couponDoc = couponSnap.docs[0]
    if (couponDoc) {
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(couponDoc.ref)
        const current = snapshot.data() as { used_count?: number } | undefined
        tx.set(couponDoc.ref, { used_count: (current?.used_count ?? 0) + 1 }, { merge: true })
      })
    }
  }

  return { id: ref.id, order_number: orderNumber }
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const snapshot = await getDoc(doc(db, 'orders', orderId))
  return snapshot.exists() ? mapOrder(snapshot.id, snapshot.data() as Partial<Order>) : null
}

export async function fetchOrderByNumber(orderNumber: string): Promise<Order | null> {
  const snap = await getDocs(query(collection(db, 'orders'), where('order_number', '==', orderNumber), limit(1)))
  const docSnap = snap.docs[0]
  return docSnap ? mapOrder(docSnap.id, docSnap.data() as Partial<Order>) : null
}

export function subscribeToOrders(callback: (payload: any) => void) {
  let isInitialSnapshot = true

  return onSnapshot(query(collection(db, 'orders'), orderBy('created_at', 'desc')), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const eventType = isInitialSnapshot && change.type === 'added'
        ? 'BOOTSTRAP'
        : change.type === 'added'
          ? 'INSERT'
          : change.type === 'modified'
            ? 'UPDATE'
            : 'DELETE'
      const payload = {
        eventType,
        new: change.type === 'removed' ? null : mapOrder(change.doc.id, change.doc.data() as Partial<Order>),
        old: { id: change.doc.id },
      }
      callback(payload)
    })

    isInitialSnapshot = false
  })
}

export function subscribeToOrder(orderId: string, callback: (order: Order | null) => void) {
  return onSnapshot(doc(db, 'orders', orderId), (snapshot) => {
    callback(snapshot.exists() ? mapOrder(snapshot.id, snapshot.data() as Partial<Order>) : null)
  })
}
