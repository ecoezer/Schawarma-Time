import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
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
          await supabase.auth.signOut()
        } catch (err) {
          console.error('Supabase sign out error:', err)
        } finally {
          // Always clear local state even if supabase call fails
          set({ 
            user: null, 
            session: null, 
            isAdmin: false, 
            isLoading: false,
            isInitialized: true 
          })
        }
      },

      refreshUser: async () => {
        try {
          // If we don't have a session, checking once is enough
          const { data: { session } } = await supabase.auth.getSession()
          
          if (!session) {
            set({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
            return
          }

          set({ session: session as any })

          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (error) {
            // If profile doesn't exist yet but user is authenticated, we keep session
            console.error('Error fetching profile during refresh:', error)
            set({ isLoading: false, isInitialized: true })
            return
          }

          if (profile) {
            get().setUser(profile as UserProfile)
          }
          
          set({ isInitialized: true, isLoading: false })
        } catch (err) {
          console.error('Refresh user error:', err)
          set({ isLoading: false, isInitialized: true })
        }
      },

      updateProfile: async (updates) => {
        const { user } = get()
        if (!user) return

        try {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)

          if (error) throw error

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
