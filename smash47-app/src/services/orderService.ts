import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, OrderItem, PaymentMethod } from '@/types'
import { handleError } from '@/lib/errorHandler'

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

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Order[]
}

export async function fetchTodayOrders(): Promise<Order[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Order[]
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Order[]
}

export async function fetchWeekOrders(): Promise<{ created_at: string; total: number; status: string }[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total, status')
    .gte('created_at', sevenDaysAgo.toISOString())
    .neq('status', 'cancelled')

  if (error) throw error
  return data || []
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

  // Atomically increment coupon used_count if applicable
  if (input.coupon_code && input.discount_amount > 0) {
    try {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('code', input.coupon_code.toUpperCase())
        .single()

      if (coupon) {
        await supabase
          .from('coupons')
          .update({ used_count: (coupon.used_count || 0) + 1 })
          .eq('code', input.coupon_code.toUpperCase())
      }
    } catch (err) {
      // Non-critical: don't fail the order if coupon increment fails
      console.error('[orderService] Coupon increment failed:', err)
    }
  }
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function subscribeToOrders(callback: (payload: any) => void) {
  const channel = supabase
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      callback
    )
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}
