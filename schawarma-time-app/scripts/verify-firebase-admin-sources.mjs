import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  getCountFromServer,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
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
const categoriesSnap = await getDocs(query(collection(db, 'categories'), orderBy('position'), limit(10)))
const productsSnap = await getDocs(query(collection(db, 'products'), orderBy('position'), limit(10)))
const couponsSnap = await getDocs(query(collection(db, 'coupons'), orderBy('created_at', 'desc'), limit(10)))
const customersSnap = await getDocs(query(collection(db, 'profiles'), where('role', '==', 'customer'), limit(10)))
const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc'), limit(10)))
const pendingCount = await getCountFromServer(query(collection(db, 'orders'), where('status', '==', 'pending')))

console.log(JSON.stringify({
  authUser: auth.currentUser?.email ?? null,
  settings: settingsSnap.docs.length,
  categories: categoriesSnap.docs.length,
  products: productsSnap.docs.length,
  coupons: couponsSnap.docs.length,
  customers: customersSnap.docs.length,
  orders: ordersSnap.docs.length,
  pendingOrders: pendingCount.data().count,
  sampleOrder: ordersSnap.docs[0]?.data() ?? null,
}, null, 2))
