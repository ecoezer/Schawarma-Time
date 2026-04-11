import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { supabase } from '@/lib/supabase'
import { HomePage } from '@/pages/HomePage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { AuthPage } from '@/pages/customer/AuthPage'
import { ProfilePage } from '@/pages/customer/ProfilePage'
import { ImpressumPage } from '@/pages/ImpressumPage'
import { DatenschutzPage } from '@/pages/DatenschutzPage'
import { AgbPage } from '@/pages/AgbPage'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminOrders } from '@/pages/admin/AdminOrders'
import { AdminMenu } from '@/pages/admin/AdminMenu'
import { AdminSettings } from '@/pages/admin/AdminSettings'
import { AdminCustomers } from '@/pages/admin/AdminCustomers'
import { AdminCampaigns } from '@/pages/admin/AdminCampaigns'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useAuthStore } from '@/store/authStore'

function CustomerLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartSidebar />
    </div>
  )
}

function AdminRoute() {
  const { user, isAdmin, isInitialized } = useAuthStore()
  if (!isInitialized) return null
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

// Blocks unauthenticated users from protected routes — avoids flash-before-redirect
function ProtectedRoute() {
  const { user, isInitialized } = useAuthStore()
  if (!isInitialized) return null
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function App() {
  const { fetchSettings } = useRestaurantStore()
  const { refreshUser } = useAuthStore()

  useEffect(() => {
    fetchSettings()
    refreshUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        useAuthStore.getState().setSession(session)
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser()
        }
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().signOut()
      }
    })

    return () => { subscription.unsubscribe() }
  }, [fetchSettings, refreshUser])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route path="/agb" element={<AgbPage />} />

            {/* Protected customer routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/bestellung" element={<CheckoutPage />} />
              <Route path="/profil" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Admin Login (standalone, no header/footer) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="bestellungen" element={<AdminOrders />} />
            <Route path="menue" element={<AdminMenu />} />
            <Route path="kampagnen" element={<AdminCampaigns />} />
            <Route path="kunden" element={<AdminCustomers />} />
            <Route path="einstellungen" element={<AdminSettings />} />
          </Route>
        </Routes>

        {/* Global Toast */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              background: '#142328',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#06c167', secondary: '#fff' },
            },
            error: {
              style: { background: '#991b1b' },
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
