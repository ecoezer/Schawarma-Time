import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import * as authService from '@/services/authService'
import type { UserProfile, UserAddress } from '@/types'
import { generateId } from '@/lib/utils'

interface AuthStore {
  user: UserProfile | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean
  isAdmin: boolean

  setUser: (user: UserProfile | null) => void
  setSession: (session: Session | null) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  addAddress: (address: Omit<UserAddress, 'id'>) => Promise<void>
  deleteAddress: (id: string) => Promise<void>
}

const ADMIN_ROLES = new Set(['manager', 'cashier', 'kitchen'])

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isInitialized: false,
      isAdmin: false,

      setUser: (user) => set({
        user,
        isAdmin: user ? ADMIN_ROLES.has(user.role) : false,
        isLoading: false,
      }),

      setSession: (session: AuthStore['session']) => set({ session }),

      signOut: async () => {
        try {
          await authService.signOut()
        } catch {
          // ignore sign-out errors — clear state regardless
        } finally {
          set({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
          localStorage.removeItem('schawarma-time-auth')
        }
      },

      refreshUser: async () => {
        try {
          await Promise.race([
            (async () => {
              const session = await authService.getSession()

              if (!session) {
                set({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
                return
              }

              set({ session })

              let profile = await authService.fetchProfile(session.user.id)

              // Sync phone from auth metadata if profile is missing it.
              // v11: validate the metadata phone before persisting — user_metadata is
              // attacker-controlled at signup time (arbitrary string can be injected).
              // Only sync if it matches the same format enforced by create_order_secure.
              if (profile && !profile.phone) {
                const metaPhone = session.user.user_metadata?.phone
                const PHONE_RE = /^[+0-9\s\-()]{7,25}$/
                if (metaPhone && typeof metaPhone === 'string' && PHONE_RE.test(metaPhone)) {
                  await authService.updateProfile(session.user.id, { phone: metaPhone })
                  profile = { ...profile, phone: metaPhone }
                }
              }

              if (profile) {
                get().setUser(profile)
              } else {
                set({ isLoading: false, isInitialized: true })
                return
              }

              set({ isInitialized: true, isLoading: false })
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 5000))
          ])
        } catch {
          set({ isLoading: false, isInitialized: true })
        }
      },

      updateProfile: async (updates) => {
        const { user } = get()
        if (!user) return
        try {
          await authService.updateProfile(user.id, updates)
          set({ user: { ...user, ...updates } })
        } catch (err) {
          throw err
        }
      },

      addAddress: async (address) => {
        const { user } = get()
        if (!user) return
        const current = user.addresses || []
        // v11: enforce address count limit client-side to mirror DB CHECK constraint (max 10)
        if (current.length >= 10) {
          throw new Error('Maximal 10 Adressen erlaubt. Bitte lösche eine Adresse, um fortzufahren.')
        }
        const newAddresses = [...current, { ...address, id: generateId() }]
        await get().updateProfile({ addresses: newAddresses })
      },

      deleteAddress: async (id) => {
        const { user } = get()
        if (!user) return
        const newAddresses = (user.addresses || []).filter(a => a.id !== id)
        await get().updateProfile({ addresses: newAddresses })
      },
    }),
    {
      name: 'schawarma-time-auth',
      partialize: (state) => ({ session: state.session }),
    }
  )
)
