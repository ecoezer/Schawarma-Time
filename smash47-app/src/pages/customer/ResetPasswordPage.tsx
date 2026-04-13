import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 10) {
      toast.error('Das Passwort muss mindestens 10 Zeichen lang sein.')
      return
    }
    if (password !== confirm) {
      toast.error('Die Passwörter stimmen nicht überein.')
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Passwort erfolgreich geändert! Du wirst angemeldet.')
      navigate('/', { replace: true })
    } catch (err: any) {
      toast.error(err?.message ?? 'Ein Fehler ist aufgetreten.')
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
          <div className="w-16 h-16 bg-[#142328] rounded-2xl flex items-center justify-center mx-auto mb-4 text-white font-black text-xl shadow-lg shadow-black/10">
            S47
          </div>
          <h1 className="text-2xl font-black text-gray-900">Neues Passwort</h1>
          <p className="text-gray-500 mt-2">Bitte wähle ein neues Passwort für dein Konto.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Neues Passwort"
            type="password"
            placeholder="Mindestens 10 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock size={18} className="text-gray-400" />}
            required
          />
          <Input
            label="Passwort bestätigen"
            type="password"
            placeholder="Passwort wiederholen"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            leftIcon={<Lock size={18} className="text-gray-400" />}
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
