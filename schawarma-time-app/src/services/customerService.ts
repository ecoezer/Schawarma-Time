import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, withFirebaseTimeout } from '@/lib/firebase'
import type { Customer, Order } from '@/types'

const CUSTOMERS_PAGE_SIZE = 50

function mapCustomer(id: string, data: Partial<Customer>): Customer {
  return {
    id,
    full_name: data.full_name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? null,
    role: data.role ?? 'customer',
    total_orders: data.total_orders ?? 0,
    loyalty_points: data.loyalty_points ?? 0,
    addresses: Array.isArray(data.addresses) ? data.addresses : [],
    created_at: data.created_at ?? new Date().toISOString(),
  }
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

export async function fetchCustomers(page = 0): Promise<{ data: Customer[]; hasMore: boolean }> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'profiles'), where('role', '==', 'customer'))),
    'Kunden laden',
  )
  const rows = snap.docs
    .map((item) => mapCustomer(item.id, item.data() as Partial<Customer>))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const start = page * CUSTOMERS_PAGE_SIZE
  const data = rows.slice(start, start + CUSTOMERS_PAGE_SIZE)
  return { data, hasMore: start + CUSTOMERS_PAGE_SIZE < rows.length }
}

export async function fetchTotalCustomerCount(): Promise<number> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'profiles'), where('role', '==', 'customer'))),
    'Kundenzahl laden',
  )
  return snap.size
}

export async function fetchCustomerOrders(userId: string): Promise<Order[]> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'orders'), where('user_id', '==', userId))),
    'Kundenbestellungen laden',
  )
  return snap.docs
    .map((item) => mapOrder(item.id, item.data() as Partial<Order>))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)
}
