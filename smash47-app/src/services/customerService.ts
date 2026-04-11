import { supabase } from '@/lib/supabase'
import type { Customer, Order } from '@/types'
import { toArray } from '@/lib/utils'

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchCustomers(): Promise<Customer[]> {
  // MED-4 fix: only fetch columns needed for customer list — no addresses/birth_date in list view
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, created_at, total_orders, loyalty_points, role')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  if (error) throw error
  return toArray(data) as Customer[]
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
