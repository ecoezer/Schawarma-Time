import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, OrderItem, PaymentMethod } from '@/types'
import { handleError } from '@/lib/errorHandler'
import { toArray } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  // order_number removed — now generated server-side (LOW-1)
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_address: string
  // Only product_id, quantity, extras, note sent — prices come from DB
  items: { product_id: string; quantity: number; extras?: OrderItem['extras']; note?: string }[]
  coupon_code: string | null
  payment_method: PaymentMethod
  // estimated_delivery_time REMOVED (v11) — now read server-side from restaurant_settings
  notes: string | null
}

export interface CreateOrderResult {
  id: string
  order_number: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOf(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return toArray(data) as Order[]
}

export async function fetchTodayOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', startOf(0))
    .order('created_at', { ascending: false })

  if (error) throw error
  return toArray(data) as Order[]
}

// v11: userId parameter removed — RLS implicitly scopes to auth.uid().
// Passing an arbitrary userId previously allowed IDOR if SELECT policy was too broad.
export async function fetchUserOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return toArray(data) as Order[]
}

export async function fetchWeekOrders(): Promise<{ created_at: string; total: number; status: string }[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total, status')
    .gte('created_at', startOf(6))
    .neq('status', 'cancelled')

  if (error) throw error
  return toArray(data)
}

export async function fetchPendingCount(): Promise<number> {
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) throw error
  return count || 0
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// v11: updated_at removed from client payload — DB trigger sets it to NOW() server-side.
// Sending updated_at from the client allowed staff to backdate order timestamps.
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) throw error
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  // All price calculation happens server-side in create_order_secure().
  // Client sends only product IDs + quantities — never prices.
  // Order number is now generated server-side (LOW-1 fix).
  // v11: p_estimated_delivery_time removed — server reads it from restaurant_settings.
  const { data, error } = await supabase.rpc('create_order_secure', {
    p_customer_name:    input.customer_name,
    p_customer_phone:   input.customer_phone,
    p_customer_email:   input.customer_email,
    p_delivery_address: input.delivery_address,
    p_items:            input.items,
    p_coupon_code:      input.coupon_code ?? null,
    p_payment_method:   input.payment_method,
    p_notes:            input.notes ?? null,
  })

  if (error) throw error

  // RPC returns JSON string: { id, order_number }
  const result = typeof data === 'string' ? JSON.parse(data) : data
  return result as CreateOrderResult
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error) return null
  return data as Order
}

export async function fetchOrderByNumber(orderNumber: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single()

  if (error) return null
  return data as Order
}

export function subscribeToOrders(callback: (payload: any) => void) {
  const channel = supabase
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
