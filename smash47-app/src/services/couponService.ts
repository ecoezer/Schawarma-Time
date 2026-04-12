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

// v11 fix: Previously called `coupons` table directly, which RLS blocks for customers
// (post-v9 policy: coupons readable only by managers). All customer coupon validation
// calls failed silently — every code showed "invalid" in the UI.
//
// New approach: call the `validate_coupon_public` SECURITY DEFINER RPC, which runs
// as the table owner, performs all checks server-side, and returns only the
// necessary fields. No code enumeration possible (uniform error messages).
export async function validateCoupon(
  code: string,
  subtotal: number,
  _userId?: string   // kept for API compat, server-side RPC uses auth.uid() internally
): Promise<CouponValidationResult> {
  const { data, error } = await supabase.rpc('validate_coupon_public', {
    p_code:     code,
    p_subtotal: subtotal,
  })

  if (error) {
    return { valid: false, discount: 0, errorMessage: 'Gutscheinprüfung fehlgeschlagen' }
  }

  const result = data as { valid: boolean; discount?: number; errorMessage?: string }

  if (!result.valid) {
    return { valid: false, discount: 0, errorMessage: result.errorMessage || 'Ungültiger Gutscheincode' }
  }

  return { valid: true, discount: result.discount ?? 0 }
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

