import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

// ─── Application-level rate limiting (v11 fix) ────────────────────────────────
// Supabase Auth has server-side rate limits, but adding a client-side layer
// prevents casual brute-force loops from even reaching the Supabase endpoint.
// Keyed by lowercase email; state is in-memory (resets on page reload — intentional,
// since persistent lockout requires server-side storage outside scope here).

interface RateLimitEntry { count: number; windowStart: number }
const loginAttempts = new Map<string, RateLimitEntry>()
const signupAttempts = new Map<string, RateLimitEntry>()
const RATE_WINDOW_MS  = 60_000  // 1 minute window
const MAX_LOGIN_TRIES = 5
const MAX_SIGNUP_TRIES = 3

function checkRateLimit(
  map: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts: number,
  errorMessage: string
): void {
  const now   = Date.now()
  const entry = map.get(key) ?? { count: 0, windowStart: now }
  const inWindow = now - entry.windowStart < RATE_WINDOW_MS

  if (inWindow && entry.count >= maxAttempts) {
    const waitSec = Math.ceil((RATE_WINDOW_MS - (now - entry.windowStart)) / 1000)
    throw new Error(`${errorMessage} Bitte warte ${waitSec} Sekunden.`)
  }

  map.set(key, {
    count:       inWindow ? entry.count + 1 : 1,
    windowStart: inWindow ? entry.windowStart : now,
  })
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  // v11: client-side rate limit — max 5 attempts per email per minute
  checkRateLimit(loginAttempts, email.toLowerCase(),
    MAX_LOGIN_TRIES, 'Zu viele Anmeldeversuche.')

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  // Reset counter on successful login
  loginAttempts.delete(email.toLowerCase())
  return data
}

export async function signUp(email: string, password: string, metadata: { full_name: string; phone: string }) {
  // v11: client-side rate limit — max 3 signups per email per minute
  checkRateLimit(signupAttempts, email.toLowerCase(),
    MAX_SIGNUP_TRIES, 'Zu viele Registrierungsversuche.')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
  // 🔴-2 fix: invalidate ALL other sessions globally after password change.
  // Stolen JWTs / refresh tokens from other devices are revoked immediately.
  await supabase.auth.signOut({ scope: 'global' })
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return null
  }
  return data as UserProfile
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error
}

