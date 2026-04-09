import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

interface AuthStore {
  user: UserProfile | null
  session: { access_token: string; user: { id: string; email: string } } | null
  isLoading: boolean
  isAdmin: boolean

  // Actions
  setUser: (user: UserProfile | null) => void
  setSession: (session: AuthStore['session']) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      isAdmin: false,

      setUser: (user) => {
        set({
          user,
          isAdmin: user?.role === 'manager' || user?.role === 'cashier' || user?.role === 'kitchen',
        })
      },

      setSession: (session) => set({ session }),

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null, isAdmin: false })
      },

      refreshUser: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          set({ user: null, session: null })
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          get().setUser(profile as UserProfile)
        }
      },
    }),
    {
      name: 'smash47-auth',
      partialize: (state) => ({ session: state.session }),
    }
  )
)
