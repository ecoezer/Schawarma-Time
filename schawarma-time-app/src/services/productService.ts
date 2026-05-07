import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  const createdAt = new Date().toISOString()
  const ref = await withFirebaseTimeout(
    addDoc(collection(db, 'categories'), {
      name,
      slug,
      position,
      is_active: true,
      created_at: createdAt,
    }),
    'Kategorie erstellen',
  )
  return mapCategory(ref.id, { name, slug, position, is_active: true, created_at: createdAt })
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  await withFirebaseTimeout(
    updateDoc(doc(db, 'categories', id), updates as Record<string, unknown>),
    'Kategorie aktualisieren',
  )
}

export async function updateCategoryPositions(updates: { id: string, position: number }[]): Promise<void> {
  await withFirebaseTimeout(
    Promise.all(updates.map((item) => updateDoc(doc(db, 'categories', item.id), { position: item.position }))),
    'Kategorien neu ordnen',
  )
}

export async function deleteCategory(id: string): Promise<void> {
  await withFirebaseTimeout(deleteDoc(doc(db, 'categories', id)), 'Kategorie löschen')
}

export async function fetchProducts(): Promise<Product[]> {
  const snap = await withFirebaseTimeout(
    getDocs(query(collection(db, 'products'), orderBy('position'))),
    'Produkte laden',
  )
  return snap.docs.map((item) => mapProduct(item.id, item.data() as Partial<Product>))
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const createdAt = new Date().toISOString()
  const ref = await withFirebaseTimeout(
    addDoc(collection(db, 'products'), {
      ...data,
      created_at: createdAt,
    }),
    'Produkt erstellen',
  )
  return mapProduct(ref.id, { ...data, created_at: createdAt })
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const ref = doc(db, 'products', id)
  const previousSnap = await withFirebaseTimeout(getDoc(ref), 'Produkt laden')
  const previousData = previousSnap.exists() ? (previousSnap.data() as Partial<Product>) : {}
  await withFirebaseTimeout(
    setDoc(ref, updates as Record<string, unknown>, { merge: true }),
    'Produkt aktualisieren',
  )
  return mapProduct(id, { ...previousData, ...updates })
}

export async function deleteProduct(id: string): Promise<void> {
  await withFirebaseTimeout(deleteDoc(doc(db, 'products', id)), 'Produkt löschen')
}
