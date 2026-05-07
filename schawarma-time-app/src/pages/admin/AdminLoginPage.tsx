import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import * as authService from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { handleError } from '@/lib/errorHandler'
import toast from 'react-hot-toast'
import logo from '@/assets/logo.png'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { setUser, setSession } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberAdmin') === 'true')

  useEffect(() => {
    const savedEmail = localStorage.getItem('adminEmail')
    if (savedEmail && rememberMe) {
      setEmail(savedEmail)
    }
  }, [rememberMe])
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data = await authService.signIn(email, password)
      
      // Save credentials if Remember Me is checked
      if (rememberMe) {
        localStorage.setItem('adminEmail', email)
        localStorage.setItem('rememberAdmin', 'true')
      } else {
        localStorage.removeItem('adminEmail')
        localStorage.setItem('rememberAdmin', 'false')
      }

      const profile = await authService.fetchProfile(data.user.id)

      if (!profile || !['manager', 'cashier', 'kitchen'].includes(profile.role)) {
        toast.error((t) => (
          <span className="flex items-center gap-2">
            Keine Admin-Berechtigung für dieses Konto
            <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
          </span>
        ), { duration: Infinity })
        await authService.signOut()
        return
      }

      setSession(data.session)
      setUser(profile)
      toast.success('Willkommen zurück!')
      navigate('/admin')
    } catch (err) {
      handleError(err, 'Anmeldung')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#142328] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img src={logo} alt="Logo" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Schawarma-Time Restaurant</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="E-Mail"
            type="email"
            autoComplete="username"
            placeholder="admin@schawarma-time.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail size={15} />}
            required
          />
          <Input
            label="Passwort"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={15} />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-gray-600 transition-colors">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
            required
          />

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#142328] focus:ring-[#142328]"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Angemeldet bleiben</span>
            </label>
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading}>
            Anmelden
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
