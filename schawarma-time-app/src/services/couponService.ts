import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore'
import { auth, db, withFirebaseTimeout } from '@/lib/firebase'
import type { Coupon, Order } from '@/types'

export interface CouponValidationResult {
  valid: boolean
  discount: number
  errorMessage?: string
}

function normalizePhone(value?: string | null): string | null {
  const normalized = (value || '').replace(/\D/g, '')
  return normalized || null
}

async function hasNonCancelledOrderByPhone(phone: string): Promise<boolean> {
  const values = [...new Set([phone, normalizePhone(phone)].filter(Boolean))] as string[]
  if (values.length === 0) return false

  const checks = await Promise.all(
    values.map((value) =>
      getDocs(query(collection(db, 'orders'), where('customer_phone', '==', value))).then((ordersSnap) =>
        ordersSnap.docs.some((item) => (item.data() as Partial<Order>).status !== 'cancelled'),
      ),
    ),
  )

  return checks.some(Boolean)
}

function mapCoupon(id: string, data: Partial<Coupon>): Coupon {
  return {
    id,
    code: data.code ?? '',
    discount_type: data.discount_type ?? 'fixed',
    discount_value: data.discount_value ?? 0,
    min_order_amount: data.min_order_amount ?? 0,
    max_uses: data.max_uses ?? null,
    used_count: data.used_count ?? 0,
    is_first_order_only: data.is_first_order_only ?? false,
    is_active: data.is_active ?? true,
    expires_at: data.expires_at ?? null,
    created_at: data.created_at ?? new Date().toISOString(),
  }
}

export async function fetchCoupons(): Promise<Coupon[]> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'coupons'), orderBy('created_at', 'desc'))),
    'Gutscheine laden',
  )
  return snap.docs.map((item) => mapCoupon(item.id, item.data() as Partial<Coupon>))
}

export async function validateCoupon(
  code: string,
  subtotal: number,
  userId?: string,
  customerPhone?: string | null,
): Promise<CouponValidationResult> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'coupons'), where('code', '==', code.trim().toUpperCase()))),
    'Gutschein prüfen',
  )
  const docSnap = snap.docs[0]
  if (!docSnap) return { valid: false, discount: 0, errorMessage: 'Ungültiger Gutscheincode' }

  const coupon = mapCoupon(docSnap.id, docSnap.data() as Partial<Coupon>)
  if (!coupon.is_active) return { valid: false, discount: 0, errorMessage: 'Gutschein ist deaktiviert' }
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { valid: false, discount: 0, errorMessage: 'Gutschein ist abgelaufen' }
  }
  if (subtotal < coupon.min_order_amount) {
    return { valid: false, discount: 0, errorMessage: 'Mindestbestellwert nicht erreicht' }
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, discount: 0, errorMessage: 'Gutschein ist bereits ausgeschöpft' }
  }
  if (coupon.is_first_order_only) {
    const checks: Promise<boolean>[] = []

    const effectiveUserId = userId || auth.currentUser?.uid || null
    if (effectiveUserId) {
      checks.push(
        getDocs(query(collection(db, 'orders'), where('user_id', '==', effectiveUserId))).then((ordersSnap) =>
          ordersSnap.docs.some((item) => (item.data() as Partial<Order>).status !== 'cancelled'),
        ),
      )
    }

    const normalizedPhone = normalizePhone(customerPhone)
    if (normalizedPhone) {
      checks.push(hasNonCancelledOrderByPhone(customerPhone || normalizedPhone))
    }

    const results = await Promise.all(checks)
    const hasPastOrder = results.some(Boolean)
    if (hasPastOrder) {
      return { valid: false, discount: 0, errorMessage: 'Nur für die erste Bestellung gültig' }
    }
  }

  const rawDiscount = coupon.discount_type === 'percentage'
    ? subtotal * (coupon.discount_value / 100)
    : coupon.discount_value

  return { valid: true, discount: Math.min(rawDiscount, subtotal) }
}

export async function createCoupon(data: Omit<Coupon, 'id' | 'created_at' | 'used_count'>): Promise<Coupon> {
  const createdAt = new Date().toISOString()
  const ref = await withFirebaseTimeout(
    addDoc(collection(db, 'coupons'), { ...data, used_count: 0, created_at: createdAt }),
    'Gutschein erstellen',
  )
  return mapCoupon(ref.id, { ...data, used_count: 0, created_at: createdAt })
}

export async function updateCoupon(id: string, data: Partial<Coupon>): Promise<void> {
  await withFirebaseTimeout(
    setDoc(doc(db, 'coupons', id), data as Record<string, unknown>, { merge: true }),
    'Gutschein aktualisieren',
  )
}

export async function deleteCoupon(id: string): Promise<void> {
  await withFirebaseTimeout(deleteDoc(doc(db, 'coupons', id)), 'Gutschein löschen')
}
