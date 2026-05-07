import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  updateProfile as updateAuthProfile,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from 'firebase/firestore'
import { auth, db, userToSession, withFirebaseTimeout, type AppSession } from '@/lib/firebase'
import type { UserProfile } from '@/types'

interface RateLimitEntry { count: number; windowStart: number }
const loginAttempts = new Map<string, RateLimitEntry>()
const signupAttempts = new Map<string, RateLimitEntry>()
const RATE_WINDOW_MS = 60_000
const MAX_LOGIN_TRIES = 5
const MAX_SIGNUP_TRIES = 3
const EMAIL_ACTION_COOLDOWN_MS = 90_000

export interface AuthPayload {
  user: { id: string; email: string | null }
  session: AppSession | null
}

function checkRateLimit(
  map: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts: number,
  errorMessage: string
): void {
  const now = Date.now()
  const entry = map.get(key) ?? { count: 0, windowStart: now }
  const inWindow = now - entry.windowStart < RATE_WINDOW_MS

  if (inWindow && entry.count >= maxAttempts) {
    const waitSec = Math.ceil((RATE_WINDOW_MS - (now - entry.windowStart)) / 1000)
    throw new Error(`${errorMessage} Bitte warte ${waitSec} Sekunden.`)
  }

  map.set(key, {
    count: inWindow ? entry.count + 1 : 1,
    windowStart: inWindow ? entry.windowStart : now,
  })
}

function emailActionKey(action: 'signup' | 'reset' | 'resend', email: string): string {
  return `schawarma-time:${action}:${email.trim().toLowerCase()}`
}

export function assertEmailActionCooldown(action: 'signup' | 'reset' | 'resend', email: string): void {
  if (typeof window === 'undefined') return
  const key = emailActionKey(action, email)
  const lastRun = Number(window.localStorage.getItem(key) || '0')
  const elapsed = Date.now() - lastRun
  if (elapsed < EMAIL_ACTION_COOLDOWN_MS) {
    const waitSec = Math.ceil((EMAIL_ACTION_COOLDOWN_MS - elapsed) / 1000)
    throw new Error(`Bitte warte ${waitSec} Sekunden, bevor du erneut eine E-Mail anforderst.`)
  }
}

export function markEmailActionSent(action: 'signup' | 'reset' | 'resend', email: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(emailActionKey(action, email), String(Date.now()))
}

function profileRef(userId: string) {
  return doc(db, 'profiles', userId)
}

function normalizeProfile(userId: string, email: string | null, data: Partial<UserProfile> | undefined): UserProfile {
  return {
    id: userId,
    email: email ?? data?.email ?? '',
    full_name: data?.full_name ?? '',
    phone: data?.phone ?? null,
    birth_date: data?.birth_date ?? null,
    role: data?.role ?? 'customer',
    addresses: Array.isArray(data?.addresses) ? data!.addresses : [],
    loyalty_points: data?.loyalty_points ?? 0,
    total_orders: data?.total_orders ?? 0,
    created_at: data?.created_at ?? new Date().toISOString(),
  }
}

export async function signIn(email: string, password: string): Promise<AuthPayload> {
  checkRateLimit(loginAttempts, email.toLowerCase(), MAX_LOGIN_TRIES, 'Zu viele Anmeldeversuche.')
  const credential = await signInWithEmailAndPassword(auth, email, password)
  loginAttempts.delete(email.toLowerCase())
  return {
    user: { id: credential.user.uid, email: credential.user.email },
    session: userToSession(credential.user),
  }
}

export async function signUp(email: string, password: string, metadata: { full_name: string; phone: string }): Promise<AuthPayload> {
  checkRateLimit(signupAttempts, email.toLowerCase(), MAX_SIGNUP_TRIES, 'Zu viele Registrierungsversuche.')
  assertEmailActionCooldown('signup', email)

  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateAuthProfile(credential.user, { displayName: metadata.full_name })
  try {
    await withFirebaseTimeout(
      setDoc(profileRef(credential.user.uid), normalizeProfile(credential.user.uid, email, {
        email,
        full_name: metadata.full_name,
        phone: metadata.phone,
        role: 'customer',
        addresses: [],
        loyalty_points: 0,
        total_orders: 0,
        created_at: new Date().toISOString(),
      }), { merge: true }),
      'Profil erstellen',
    )
  } catch (profileError) {
    console.warn('Profile bootstrap during signup failed:', profileError)
  }
  markEmailActionSent('signup', email)

  return {
    user: { id: credential.user.uid, email: credential.user.email },
    session: userToSession(credential.user),
  }
}

export async function resendVerificationEmail(email: string): Promise<void> {
  assertEmailActionCooldown('resend', email)
  if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== email.toLowerCase()) {
    throw new Error('Bitte melde dich an, um eine neue Bestätigungs-E-Mail zu senden.')
  }
  await sendEmailVerification(auth.currentUser)
  markEmailActionSent('resend', email)
}

export async function requestPasswordReset(email: string, redirectUrl: string): Promise<void> {
  assertEmailActionCooldown('reset', email)
  await sendPasswordResetEmail(auth, email, {
    url: redirectUrl,
    handleCodeInApp: true,
  })
  markEmailActionSent('reset', email)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export async function getSession(): Promise<AppSession | null> {
  return userToSession(auth.currentUser)
}

export async function changePassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Keine aktive Sitzung gefunden.')
  await updatePassword(auth.currentUser, newPassword)
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const snap = await withFirebaseTimeout(getDoc(profileRef(userId)), 'Profil laden')
  if (!snap.exists()) {
    const currentEmail = auth.currentUser?.uid === userId ? auth.currentUser.email : null
    return normalizeProfile(userId, currentEmail, undefined)
  }
  const data = snap.data() as Partial<UserProfile>
  const currentEmail = auth.currentUser?.uid === userId ? auth.currentUser.email : data.email ?? null
  return normalizeProfile(userId, currentEmail, data)
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  await withFirebaseTimeout(setDoc(profileRef(userId), updates, { merge: true }), 'Profil speichern')
}

export async function incrementCustomerOrderStats(userId: string | null): Promise<void> {
  if (!userId) return
  await withFirebaseTimeout(
    runTransaction(db, async (tx) => {
      const ref = profileRef(userId)
      const snap = await tx.get(ref)
      const current = snap.exists() ? (snap.data() as Partial<UserProfile>) : {}
      tx.set(ref, {
        total_orders: (current.total_orders ?? 0) + 1,
        loyalty_points: current.loyalty_points ?? 0,
        role: current.role ?? 'customer',
        created_at: current.created_at ?? new Date().toISOString(),
      }, { merge: true })
    }),
    'Kundenstatistik aktualisieren',
  )
}
