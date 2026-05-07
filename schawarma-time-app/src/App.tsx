import { Toaster } from 'react-hot-toast'
import { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom'
import { onIdTokenChanged } from 'firebase/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartSidebar } from '@/components/cart/CartSidebar'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { auth, userToSession } from '@/lib/firebase'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { StatusBar } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useAuthStore } from '@/store/authStore'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })))
const AuthPage = lazy(() => import('@/pages/customer/AuthPage').then((m) => ({ default: m.AuthPage })))
const ResetPasswordPage = lazy(() => import('@/pages/customer/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const ImpressumPage = lazy(() => import('@/pages/ImpressumPage').then((m) => ({ default: m.ImpressumPage })))
const DatenschutzPage = lazy(() => import('@/pages/DatenschutzPage').then((m) => ({ default: m.DatenschutzPage })))
const AgbPage = lazy(() => import('@/pages/AgbPage').then((m) => ({ default: m.AgbPage })))
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })))
const AdminMenu = lazy(() => import('@/pages/admin/AdminMenu').then((m) => ({ default: m.AdminMenu })))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })))
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers').then((m) => ({ default: m.AdminCustomers })))
const AdminCampaigns = lazy(() => import('@/pages/admin/AdminCampaigns').then((m) => ({ default: m.AdminCampaigns })))

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

function GuardLoadingScreen() {
  return <LoadingScreen />
}

function AdminRoute() {
  const { user, isAdmin, isInitialized, isLoading } = useAuthStore()
  if (!isInitialized || isLoading) return <GuardLoadingScreen />
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

function ManagerRoute() {
  const { user, isInitialized, isLoading } = useAuthStore()
  if (!isInitialized || isLoading) return <GuardLoadingScreen />
  if (user?.role !== 'manager') return <Navigate to="/admin" replace />
  return <Outlet />
}

function ProtectedRoute() {
  const { user, isInitialized, isLoading } = useAuthStore()
  if (!isInitialized || isLoading) return <GuardLoadingScreen />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function AppContent() {
  const fetchSettings = useRestaurantStore(state => state.fetchSettings)
  const refreshUser = useAuthStore(state => state.refreshUser)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => setShowSplash(false), 4000)
      return () => clearTimeout(timer)
    }
    setShowSplash(false)
  }, [])

  useEffect(() => {
    fetchSettings()
    refreshUser()

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      const session = userToSession(firebaseUser)
      if (session) {
        useAuthStore.getState().setSession(session)
        await refreshUser()
      } else {
        useAuthStore.setState({ user: null, session: null, isAdmin: false, isLoading: false, isInitialized: true })
      }
    })

    if (Capacitor.isNativePlatform()) {
      KeepAwake.keepAwake().catch(err => console.warn('KeepAwake failed:', err))
      StatusBar.hide().catch((err: unknown) => console.warn('StatusBar hide failed:', err))
    }

    return () => {
      unsubscribe()
      if (Capacitor.isNativePlatform()) {
        KeepAwake.allowSleep().catch(() => {})
      }
    }
  }, [fetchSettings, refreshUser])

  return (
    <>
      {showSplash && <LoadingScreen />}
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/admin" replace /> : <HomePage />} />
            <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/passwort-zuruecksetzen" element={<ResetPasswordPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/datenschutz" element={<DatenschutzPage />} />
          <Route path="/agb" element={<AgbPage />} />
          <Route path="/bestellung" element={<CheckoutPage />} />
          <Route element={<ProtectedRoute />}>
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
      </Suspense>

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
