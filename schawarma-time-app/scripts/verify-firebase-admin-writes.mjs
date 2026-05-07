import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

const envText = readFileSync(new URL('../.env', import.meta.url), 'utf8')
for (const line of envText.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) continue
  process.env[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1)
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

const auth = getAuth(app)
const db = getFirestore(app)

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.')
}

await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD)

const settingsSnap = await getDocs(query(collection(db, 'restaurant_settings'), limit(1)))
const settingsDoc = settingsSnap.docs[0]
if (!settingsDoc) throw new Error('No restaurant_settings document found.')

const settingsBefore = settingsDoc.data()
await setDoc(doc(db, 'restaurant_settings', settingsDoc.id), {
  announcement: 'Codex rule check',
  is_announcement_active: true,
}, { merge: true })
await setDoc(doc(db, 'restaurant_settings', settingsDoc.id), {
  announcement: settingsBefore.announcement ?? null,
  is_announcement_active: settingsBefore.is_announcement_active ?? false,
}, { merge: true })

const categoryRef = await addDoc(collection(db, 'categories'), {
  name: 'Codex Test Kategorie',
  slug: `codex-test-${Date.now()}`,
  position: 9999,
  is_active: true,
  created_at: new Date().toISOString(),
})

const productRef = await addDoc(collection(db, 'products'), {
  category_id: categoryRef.id,
  name: 'Codex Test Produkt',
  description: 'Wird sofort gelöscht',
  price: 1.23,
  image_url: null,
  image_url_modal: null,
  is_active: true,
  is_most_liked: false,
  is_vegetarian: false,
  is_vegan: false,
  is_halal: true,
  allergens: [],
  calories: null,
  extra_groups: [],
  sizes: [],
  position: 9999,
  created_at: new Date().toISOString(),
})

await updateDoc(productRef, {
  name: 'Codex Test Produkt Aktualisiert',
})

const couponRef = await addDoc(collection(db, 'coupons'), {
  code: `CODEX${Date.now().toString().slice(-5)}`,
  discount_type: 'fixed',
  discount_value: 1,
  min_order_amount: 0,
  max_uses: 1,
  used_count: 0,
  is_first_order_only: false,
  is_active: true,
  expires_at: null,
  created_at: new Date().toISOString(),
})

await updateDoc(couponRef, {
  is_active: false,
})

await deleteDoc(couponRef)
await deleteDoc(productRef)
await deleteDoc(categoryRef)

console.log(JSON.stringify({
  authUser: auth.currentUser?.email ?? null,
  settingsWrite: 'ok',
  categoryCreateDelete: 'ok',
  productCreateUpdateDelete: 'ok',
  couponCreateUpdateDelete: 'ok',
}, null, 2))
