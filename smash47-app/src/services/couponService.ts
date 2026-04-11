import { supabase } from '@/lib/supabase'
import type { Coupon } from '@/types'
import { toArray } from '@/lib/utils'

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return toArray(data) as Coupon[]
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface CouponValidationResult {
  valid: boolean
  discount: number
  errorMessage?: string
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string
): Promise<CouponValidationResult> {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error || !coupon) {
    return { valid: false, discount: 0, errorMessage: 'Ungültiger Gutscheincode' }
  }

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, discount: 0, errorMessage: 'Dieser Gutschein ist abgelaufen' }
  }

  // Check max usage
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, discount: 0, errorMessage: 'Dieser Gutschein wurde bereits zu oft eingelöst' }
  }

  // Check first-order-only
  if (coupon.is_first_order_only && userId) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'cancelled')

    if (count && count > 0) {
      return { valid: false, discount: 0, errorMessage: 'Dieser Gutschein gilt nur für die erste Bestellung' }
    }
  }

  // Check min order amount
  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      discount: 0,
      errorMessage: `Mindestbestellwert für diesen Gutschein ist €${coupon.min_order_amount.toFixed(2)}`
    }
  }

  // Calculate discount
  const discount = coupon.discount_type === 'percentage'
    ? (subtotal * coupon.discount_value) / 100
    : coupon.discount_value

  return { valid: true, discount }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createCoupon(data: Omit<Coupon, 'id' | 'created_at' | 'used_count'>): Promise<Coupon> {
  const { data: created, error } = await supabase
    .from('coupons')
    .insert([{ ...data, used_count: 0 }])
    .select()

  if (error) throw error
  return created![0] as Coupon
}

export async function updateCoupon(id: string, data: Partial<Coupon>): Promise<void> {
  const { error } = await supabase
    .from('coupons')
    .update(data)
    .eq('id', id)

  if (error) throw error
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id)

  if (error) throw error
}

