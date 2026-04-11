import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, OrderItem, PaymentMethod } from '@/types'
import { handleError } from '@/lib/errorHandler'
import { toArray } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_address: string
  // Only product_id, quantity, extras, note sent — prices come from DB
  items: { product_id: string; quantity: number; extras?: OrderItem['extras']; note?: string }[]
  coupon_code: string | null
  payment_method: PaymentMethod
  estimated_delivery_time: number
  notes: string | null
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

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
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

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) throw error
}

export async function createOrder(input: CreateOrderInput): Promise<void> {
  // All price calculation happens server-side in create_order_secure().
  // Client sends only product IDs + quantities — never prices.
  const { error } = await supabase.rpc('create_order_secure', {
    p_order_number:           input.order_number,
    p_customer_name:          input.customer_name,
    p_customer_phone:         input.customer_phone,
    p_customer_email:         input.customer_email,
    p_delivery_address:       input.delivery_address,
    p_items:                  input.items,
    p_coupon_code:            input.coupon_code ?? null,
    p_payment_method:         input.payment_method,
    p_notes:                  input.notes ?? null,
    p_estimated_delivery_time: input.estimated_delivery_time,
  })

  if (error) throw error
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

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
