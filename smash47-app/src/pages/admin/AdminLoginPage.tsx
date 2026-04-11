import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import * as authService from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { handleError } from '@/lib/errorHandler'
import toast from 'react-hot-toast'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { setUser, setSession } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data = await authService.signIn(email, password)
      const profile = await authService.fetchProfile(data.user.id)

      if (!profile || !['manager', 'cashier', 'kitchen'].includes(profile.role)) {
        toast.error('Keine Admin-Berechtigung für dieses Konto')
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
          <div className="w-16 h-16 bg-[#142328] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-black text-lg">S47</span>
          </div>
          <h1 className="text-xl font-black text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Smash47 Restaurant</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="E-Mail"
            type="email"
            placeholder="admin@smash47.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Lock size={15} />}
            required
          />
          <Input
            label="Passwort"
            type={showPassword ? 'text' : 'password'}
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
          <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading}>
            Anmelden
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
