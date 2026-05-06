import { create } from 'zustand'
import * as authService from '@/services/authService'
import type { UserProfile, UserAddress } from '@/types'
import { generateId } from '@/lib/utils'
import type { AppSession } from '@/lib/firebase'

interface AuthStore {
  user: UserProfile | null
  session: AppSession | null
  isLoading: boolean
  isInitialized: boolean
  isAdmin: boolean

  setUser: (user: UserProfile | null) => void
  setSession: (session: AppSession | null) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  addAddress: (address: Omit<UserAddress, 'id'>) => Promise<void>
  deleteAddress: (id: string) => Promise<void>
}

const ADMIN_ROLES = new Set(['manager', 'cashier', 'kitchen'])

function clearStoredAuthState() {
  localStorage.removeItem('schawarma-time-auth')
}

export const useAuthStore = create<AuthStore>((set, get) => ({
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

  setSession: (session) => set({ session }),

  signOut: async () => {
    set({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
    clearStoredAuthState()
    try {
      await authService.signOut()
    } catch {
      // ignore
    }
  },

  refreshUser: async () => {
    try {
      const session = await authService.getSession()
      if (!session) {
        set({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
        return
      }

      set({ session })
      let profile = await authService.fetchProfile(session.user.id)

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
      }

      set({ isInitialized: true, isLoading: false })
    } catch {
      set({ isLoading: false, isInitialized: true })
    }
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return
    await authService.updateProfile(user.id, updates)
    set({ user: { ...user, ...updates } })
  },

  addAddress: async (address) => {
    const { user } = get()
    if (!user) return
    const current = user.addresses || []
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
}))

