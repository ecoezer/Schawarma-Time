import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, OrderItem, PaymentMethod } from '@/types'
import { handleError } from '@/lib/errorHandler'
import { toArray } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  order_number: string
  user_id: string | undefined
  customer_name: string
  customer_phone: string
  customer_email: string
  delivery_address: string
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  discount_amount: number
  coupon_code: string | null
  total: number
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
  const { error } = await supabase
    .from('orders')
    .insert([{ ...input, status: 'pending' }])

  if (error) throw error

  // Atomically increment coupon used_count if applicable.
  // Requires SQL function: create function increment_coupon_usage(coupon_code text)
  // returns void as $$ update coupons set used_count = used_count + 1 where code = coupon_code; $$ language sql;
  if (input.coupon_code && input.discount_amount > 0) {
    try {
      await supabase.rpc('increment_coupon_usage', {
        coupon_code: input.coupon_code.toUpperCase()
      })
    } catch {
      // Non-critical: don't fail the order if coupon increment fails
    }
  }
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToOrders(callback: (payload: any) => void) {
  const channel = supabase
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
