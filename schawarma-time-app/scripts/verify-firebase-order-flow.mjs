import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'

const envText = readFileSync(new URL('../.env', import.meta.url), 'utf8')
for (const line of envText.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) continue
  const key = trimmed.slice(0, eqIndex)
  const value = trimmed.slice(eqIndex + 1)
  process.env[key] = value
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

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD)
}

const productsSnap = await getDocs(query(collection(db, 'products'), orderBy('position'), limit(2)))
const settingsSnap = await getDocs(query(collection(db, 'restaurant_settings'), limit(1)))

if (productsSnap.empty) {
  throw new Error('No products found in Firebase.')
}

const productDoc = productsSnap.docs[0]
const product = productDoc.data()
const settings = settingsSnap.docs[0]?.data() ?? {}

const itemPrice = Number(product.price ?? 0)
const deliveryFee = Number(settings.delivery_fee ?? 0)
const now = new Date().toISOString()
const orderNumber = `CFTEST-${Date.now().toString().slice(-6)}`

const created = await addDoc(collection(db, 'orders'), {
  order_number: orderNumber,
  user_id: null,
  customer_name: 'Codex Testkunde',
  customer_phone: '015112223344',
  customer_email: 'test@example.com',
  delivery_address: 'Selbstabholung',
  delivery_lat: null,
  delivery_lng: null,
  items: [
    {
      product_id: productDoc.id,
      product_name: product.name ?? 'Testprodukt',
      quantity: 1,
      unit_price: itemPrice,
      extras: [],
      note: 'Automatischer Stabilitätstest',
      subtotal: itemPrice,
    },
  ],
  subtotal: itemPrice,
  delivery_fee: 0,
  discount_amount: 0,
  coupon_code: null,
  total: itemPrice,
  status: 'pending',
  payment_method: 'cash',
  estimated_delivery_time: Number(settings.estimated_delivery_time ?? 35),
  notes: 'Automatisch erstellt',
  rejection_reason: null,
  created_at: now,
  updated_at: now,
})

let statusUpdate = 'skipped'
if (auth.currentUser) {
  await updateDoc(doc(db, 'orders', created.id), {
    status: 'confirmed',
    updated_at: new Date().toISOString(),
  })
  statusUpdate = 'confirmed'
}

const latestOrders = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc'), limit(3)))

console.log(JSON.stringify({
  createdOrderId: created.id,
  createdOrderNumber: orderNumber,
  product: {
    id: productDoc.id,
    name: product.name ?? null,
    price: itemPrice,
  },
  latestOrders: latestOrders.docs.map((item) => ({
    id: item.id,
    order_number: item.data().order_number,
    status: item.data().status,
    customer_name: item.data().customer_name,
    total: item.data().total,
  })),
  authUser: auth.currentUser?.email ?? null,
  statusUpdate,
}, null, 2))
