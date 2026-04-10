import { supabase } from '@/lib/supabase'
import type { Product, Category } from '@/types'

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('position')

  if (error) throw error
  return (data || []) as Category[]
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('position')

  if (error) throw error
  return (data || []) as Product[]
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const { data: created, error } = await supabase
    .from('products')
    .insert([data])
    .select()

  if (error) throw error
  return created![0] as Product
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product> {
  const { data: updated, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) throw error
  if (!updated || updated.length === 0) {
    throw new Error('Keine Zeilen aktualisiert — RLS blockiert die Änderung.')
  }
  return updated[0] as Product
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}
