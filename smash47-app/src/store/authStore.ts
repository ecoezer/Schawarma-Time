import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authService from '@/services/authService'
import type { UserProfile, UserAddress } from '@/types'

interface AuthStore {
  user: UserProfile | null
  session: { access_token: string; user: { id: string; email: string } } | null
  isLoading: boolean
  isInitialized: boolean
  isAdmin: boolean

  // Actions
  setUser: (user: UserProfile | null) => void
  setSession: (session: AuthStore['session']) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  addAddress: (address: Omit<UserAddress, 'id'>) => Promise<void>
  deleteAddress: (id: string) => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true, // Start with loading true
      isInitialized: false,
      isAdmin: false,

      setUser: (user) => {
        set({
          user,
          isAdmin: user?.role === 'manager' || user?.role === 'cashier' || user?.role === 'kitchen',
          isLoading: false,
        })
      },

      setSession: (session) => set({ session }),

      signOut: async () => {
        try {
          await authService.signOut()
        } catch (err) {
          console.error('Sign out error:', err)
        } finally {
          // Always clear local state even if service call fails
          set({ 
            user: null, 
            session: null, 
            isAdmin: false, 
            isLoading: false,
            isInitialized: true 
          })
          
          // Clear any local storage used by Supabase just in case
          localStorage.removeItem('smash47-auth')
        }
      },

      refreshUser: async () => {
        try {
          // Add a 5s timeout for the entire refresh process
          const refreshTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth Timeout')), 5000)
          )

          const process = async () => {
            const session = await authService.getSession()
            
            if (!session) {
              set({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
              return
            }

            set({ session: session as any })

            const profile = await authService.fetchProfile(session.user.id)

            if (profile) {
              get().setUser(profile)
            } else {
              // If profile fetch fails, we still have the session
              set({ isLoading: false, isInitialized: true })
              return
            }
            
            set({ isInitialized: true, isLoading: false })
          }

          await Promise.race([process(), refreshTimeout])
        } catch (err) {
          console.error('Refresh user error:', err)
          // Always mark as initialized to avoid white screen
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
          console.error('Update profile error:', err)
          throw err
        }
      },

      addAddress: async (address) => {
        const { user } = get()
        if (!user) return

        const newAddress: UserAddress = {
          ...address,
          id: Math.random().toString(36).substr(2, 9)
        }

        const newAddresses = [...(user.addresses || []), newAddress]
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
      name: 'smash47-auth',
      partialize: (state) => ({ session: state.session }),
    }
  )
)
