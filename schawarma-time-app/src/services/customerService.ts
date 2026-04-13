import { supabase } from '@/lib/supabase'
import type { Customer, Order } from '@/types'
import { toArray } from '@/lib/utils'

// ─── Queries ──────────────────────────────────────────────────────────────────

const CUSTOMERS_PAGE_SIZE = 50

// v12: pagination added — unbounded SELECT on profiles is a DoS and PII risk.
export async function fetchCustomers(page = 0): Promise<{ data: Customer[]; hasMore: boolean }> {
  const from = page * CUSTOMERS_PAGE_SIZE
  const to   = from + CUSTOMERS_PAGE_SIZE - 1

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, created_at, total_orders, loyalty_points, role')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  const rows = toArray(data) as Customer[]
  return { data: rows, hasMore: rows.length === CUSTOMERS_PAGE_SIZE }
}

export async function fetchTotalCustomerCount(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')

  if (error) throw error
  return count || 0
}

export async function fetchCustomerOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return toArray(data) as Order[]
}
