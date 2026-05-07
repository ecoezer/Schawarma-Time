import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence, type User } from 'firebase/auth'
import { getFirestore, serverTimestamp, Timestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.warn('[Schawarma-Time] Firebase config is incomplete. Please set the VITE_FIREBASE_* env variables.')
}

export const firebaseProjectId = firebaseConfig.projectId || ''

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

auth.languageCode = 'de'

setPersistence(auth, browserLocalPersistence).catch(() => {})

export interface AppSession {
  user: {
    id: string
    email: string | null
    user_metadata: Record<string, unknown>
  }
}

export function userToSession(user: User | null): AppSession | null {
  if (!user) return null
  return {
    user: {
      id: user.uid,
      email: user.email,
      user_metadata: {
        displayName: user.displayName,
        phone: user.phoneNumber,
      },
    },
  }
}

export function firestoreNow() {
  return serverTimestamp()
}

export function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

export async function withFirebaseTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = 8000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} reagiert nicht. Bitte Firebase-Verbindung oder Firestore-Regeln prüfen.`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
