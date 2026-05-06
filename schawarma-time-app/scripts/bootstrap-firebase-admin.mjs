import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { doc, getFirestore, setDoc } from 'firebase/firestore'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const APP_DIR = path.resolve(__dirname, '..')

function parseEnvFile(content) {
  const env = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

async function loadFirebaseConfig() {
  const envRaw = await fs.readFile(path.join(APP_DIR, '.env'), 'utf8')
  const env = parseEnvFile(envRaw)
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
}

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL und ADMIN_PASSWORD sind erforderlich.')
  }

  const firebaseConfig = await loadFirebaseConfig()
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  let credential
  try {
    credential = await signInWithEmailAndPassword(auth, email, password)
    console.log(`Signed in existing admin auth user: ${email}`)
  } catch (error) {
    credential = await createUserWithEmailAndPassword(auth, email, password)
    console.log(`Created new admin auth user: ${email}`)
  }

  await setDoc(doc(db, 'profiles', credential.user.uid), {
    id: credential.user.uid,
    email,
    full_name: 'Schawarma Time Admin',
    phone: null,
    birth_date: null,
    role: 'manager',
    addresses: [],
    loyalty_points: 0,
    total_orders: 0,
    created_at: new Date().toISOString(),
  }, { merge: true })

  console.log(`Ensured manager profile for ${email} (${credential.user.uid}).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
