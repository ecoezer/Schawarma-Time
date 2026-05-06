import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, timestampToIso, withFirebaseTimeout } from '@/lib/firebase'
import type { Product, Category } from '@/types'

function mapCategory(id: string, data: Partial<Category>): Category {
  return {
    id,
    name: data.name ?? '',
    slug: data.slug ?? '',
    position: data.position ?? 0,
    is_active: data.is_active ?? true,
    created_at: timestampToIso(data.created_at),
  }
}

function mapProduct(id: string, data: Partial<Product>): Product {
  return {
    id,
    category_id: data.category_id ?? '',
    name: data.name ?? '',
    description: data.description ?? null,
    price: data.price ?? 0,
    image_url: data.image_url ?? null,
    image_url_modal: data.image_url_modal ?? null,
    is_active: data.is_active ?? true,
    is_most_liked: data.is_most_liked ?? false,
    is_vegetarian: data.is_vegetarian ?? false,
    is_vegan: data.is_vegan ?? false,
    is_halal: data.is_halal ?? false,
    allergens: Array.isArray(data.allergens) ? data.allergens : [],
    calories: data.calories ?? null,
    extra_groups: Array.isArray(data.extra_groups) ? data.extra_groups : [],
    sizes: Array.isArray(data.sizes) ? data.sizes : [],
    position: data.position ?? 0,
    created_at: timestampToIso(data.created_at),
    category: data.category,
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'categories'), orderBy('position'))),
    'Kategorien laden',
  )
  return snap.docs.map((item) => mapCategory(item.id, item.data() as Partial<Category>))
}

export async function createCategory(name: string, slug: string, position: number): Promise<Category> {
  const ref = await addDoc(collection(db, 'categories'), {
    name,
    slug,
    position,
    is_active: true,
    created_at: new Date().toISOString(),
  })
  return mapCategory(ref.id, { name, slug, position, is_active: true, created_at: new Date().toISOString() })
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, 'categories', id), updates as Record<string, unknown>)
}

export async function updateCategoryPositions(updates: { id: string, position: number }[]): Promise<void> {
  await Promise.all(updates.map((item) => updateDoc(doc(db, 'categories', item.id), { position: item.position })))
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id))
}

export async function fetchProducts(): Promise<Product[]> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'products'), orderBy('position'))),
    'Produkte laden',
  )
  return snap.docs.map((item) => mapProduct(item.id, item.data() as Partial<Product>))
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const ref = await addDoc(collection(db, 'products'), {
    ...data,
    created_at: new Date().toISOString(),
  })
  return mapProduct(ref.id, { ...data, created_at: new Date().toISOString() })
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const ref = doc(db, 'products', id)
  await setDoc(ref, updates as Record<string, unknown>, { merge: true })
  return mapProduct(id, updates)
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, 'products', id))
}
