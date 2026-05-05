import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import logo from '@/assets/logo.png'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Das Passwort muss mindestens 8 Zeichen lang sein.
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return
    }
    if (password !== confirm) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Die Passwörter stimmen nicht überein.
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Passwort erfolgreich geändert! Du wirst angemeldet.')
      navigate('/', { replace: true })
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          {err?.message ?? 'Ein Fehler ist aufgetreten.'}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <img src={logo} alt="Logo" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Neues Passwort</h1>
          <p className="text-gray-500 mt-2">Bitte wähle ein neues Passwort für dein Konto.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Neues Passwort"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mindestens 8 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} className="text-gray-400" />}
            rightIcon={
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                className="hover:text-gray-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
          />
          <Input
            label="Passwort bestätigen"
            type={showPassword ? 'text' : 'password'}
            placeholder="Passwort wiederholen"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            leftIcon={<Lock size={18} className="text-gray-400" />}
            rightIcon={
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                className="hover:text-gray-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            required
          />
          <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading}>
            Passwort speichern
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
