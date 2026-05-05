import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useNavigate, BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { supabase } from '@/lib/supabase'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { StatusBar } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { HomePage } from '@/pages/HomePage'
import { CheckoutPage } from '@/pages/CheckoutPage'
import { AuthPage } from '@/pages/customer/AuthPage'
import { ResetPasswordPage } from '@/pages/customer/ResetPasswordPage'
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
import { LoadingScreen } from '@/components/ui/LoadingScreen'

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

function ManagerRoute() {
  const { user, isInitialized } = useAuthStore()
  if (!isInitialized) return null
  if (user?.role !== 'manager') return <Navigate to="/admin" replace />
  return <Outlet />
}

function ProtectedRoute() {
  const { user, isInitialized } = useAuthStore()
  if (!isInitialized) return null
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function AppContent() {
  const navigate = useNavigate()
  const { fetchSettings } = useRestaurantStore()
  const { refreshUser } = useAuthStore()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => setShowSplash(false), 4000)
      return () => clearTimeout(timer)
    } else {
      setShowSplash(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    refreshUser()

    // Redirect logic moved to Route definition to prevent flicker

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        useAuthStore.getState().setSession(session)
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser()
        }
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
        localStorage.removeItem('schawarma-time-auth')
      }
    })

    if (Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(err => console.warn('KeepAwake failed:', err))
      StatusBar.hide().catch((err: any) => console.warn('StatusBar hide failed:', err))
    }

    return () => { 
      subscription.unsubscribe() 
      if (Capacitor.isNativePlatform()) {
        KeepAwake.allowSleep().catch(() => {})
      }
    }
  }, [navigate, fetchSettings, refreshUser])

  return (
    <>
      {showSplash && <LoadingScreen />}
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/admin" replace /> : <HomePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/passwort-zuruecksetzen" element={<ResetPasswordPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/datenschutz" element={<DatenschutzPage />} />
          <Route path="/agb" element={<AgbPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/bestellung" element={<CheckoutPage />} />
            <Route path="/profil" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<AdminDashboard />} />
          <Route path="bestellungen" element={<AdminOrders />} />
          <Route path="menue" element={<AdminMenu />} />
          <Route element={<ManagerRoute />}>
            <Route path="kampagnen" element={<AdminCampaigns />} />
            <Route path="kunden" element={<AdminCustomers />} />
            <Route path="einstellungen" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>

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
    </>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
