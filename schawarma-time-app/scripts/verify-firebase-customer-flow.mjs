import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  collection,
  setDoc,
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

const testEmail = `codex-test-${Date.now()}@example.com`
const testPassword = 'Codex12345!'

const credential = await createUserWithEmailAndPassword(auth, testEmail, testPassword)

let initialWrite = 'ok'
try {
  await setDoc(doc(db, 'profiles', credential.user.uid), {
    id: credential.user.uid,
    email: testEmail,
    full_name: 'Codex Testkunde',
    phone: '015199988877',
    birth_date: null,
    role: 'customer',
    addresses: [],
    loyalty_points: 0,
    total_orders: 0,
    created_at: new Date().toISOString(),
  }, { merge: true })
} catch (error) {
  initialWrite = error.code || error.message || 'failed'
}

if (initialWrite !== 'ok') {
  await signOut(auth)
  await signInWithEmailAndPassword(auth, testEmail, testPassword)
  await setDoc(doc(db, 'profiles', credential.user.uid), {
    id: credential.user.uid,
    email: testEmail,
    full_name: 'Codex Testkunde',
    phone: '015199988877',
    birth_date: null,
    role: 'customer',
    addresses: [],
    loyalty_points: 0,
    total_orders: 0,
    created_at: new Date().toISOString(),
  }, { merge: true })
}

const ownProfile = await getDoc(doc(db, 'profiles', credential.user.uid))

await setDoc(doc(db, 'profiles', credential.user.uid), {
  full_name: 'Codex Testkunde Aktualisiert',
  addresses: [
    {
      id: 'addr-1',
      label: 'Zuhause',
      street: 'Musterstraße 1',
      city: 'Berlin',
      postal_code: '10115',
      lat: null,
      lng: null,
    },
  ],
}, { merge: true })

const updatedProfile = await getDoc(doc(db, 'profiles', credential.user.uid))

await signOut(auth)
await signInWithEmailAndPassword(auth, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD)

const customerList = await getDocs(query(collection(db, 'profiles'), where('role', '==', 'customer')))
const foundCustomer = customerList.docs.find((item) => item.id === credential.user.uid)

await signOut(auth)
await signInWithEmailAndPassword(auth, testEmail, testPassword)
await deleteUser(auth.currentUser)

console.log(JSON.stringify({
  createdCustomerId: credential.user.uid,
  initialWrite,
  ownProfileReadable: ownProfile.exists(),
  ownProfileUpdateWorked: updatedProfile.data()?.full_name === 'Codex Testkunde Aktualisiert',
  ownAddressWriteWorked: Array.isArray(updatedProfile.data()?.addresses) && updatedProfile.data()?.addresses.length === 1,
  visibleInAdminCustomerQuery: Boolean(foundCustomer),
  profileCleanup: 'skipped-by-rules',
}, null, 2))
