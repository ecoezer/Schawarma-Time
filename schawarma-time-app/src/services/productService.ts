import { supabase } from '@/lib/supabase'
import type { Product, Category } from '@/types'
import { toArray } from '@/lib/utils'

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('position')

  if (error) throw error
  return toArray(data) as Category[]
}

export async function createCategory(name: string, slug: string, position: number): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, slug, position, is_active: true }])
    .select()

  if (error) throw error
  return data![0] as Category
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function updateCategoryPositions(updates: { id: string, position: number }[]): Promise<void> {
  // Upsert in Supabase allows updating multiple rows by PK (id) if we only provide id and the fields to update
  const { error } = await supabase
    .from('categories')
    .upsert(updates)

  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('position')

  if (error) throw error
  return toArray(data) as Product[]
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
