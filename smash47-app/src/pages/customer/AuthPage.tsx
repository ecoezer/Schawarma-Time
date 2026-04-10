import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Phone, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { setUser, setSession } = useAuthStore()

  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.email) errs.email = 'E-Mail ist erforderlich'
    if (!formData.password) errs.password = 'Passwort ist erforderlich'
    if (!isLogin) {
      if (!formData.fullName) errs.fullName = 'Name ist erforderlich'
      if (!formData.phone) {
        errs.phone = 'Telefon ist erforderlich'
      } else if (!formData.phone.startsWith('+491')) {
        errs.phone = 'Nummer muss mit +491 beginnen'
      } else if (formData.phone.length < 10) {
        errs.phone = 'Ungültige Nummer'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })
        if (error) throw error

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        setSession(data as any)
        setUser(profile)
        toast.success('Willkommen zurück!')
        navigate(redirect)
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
            }
          }
        })
        if (error) throw error

        if (data.user) {
          // Check if session was created (if email confirm is disabled)
          if (data.session) {
            setSession(data as any)
            // Profile should be created by trigger, so fetch it
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()
            setUser(profile)
            toast.success('Konto erfolgreich erstellt!')
            navigate(redirect)
          } else {
            // Email confirmation is ON
            toast.success('Registrierung erfolgreich! Bitte prüfe deine E-Mails, um dein Konto zu bestätigen.', {
              duration: 6000,
            })
            setIsLogin(true)
          }
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      let message = 'Ein Fehler ist aufgetreten'
      if (err.message === 'Failed to fetch') {
        message = 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.'
      } else if (err.status === 400 && err.code === 'email_address_invalid') {
        message = 'Ungültige E-Mail-Adresse.'
      } else if (err.status === 400 && err.code === 'weak_password') {
        message = 'Das Passwort ist zu schwach (min. 6 Zeichen).'
      } else if (err.message) {
        message = err.message
      }
      toast.error(message)
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
          <h1 className="text-2xl font-black text-gray-900">
            {isLogin ? 'Willkommen zurück' : 'Konto erstellen'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isLogin
              ? 'Melde dich an, um mit deiner Bestellung fortzufahren.'
              : 'Erstelle ein Konto für ein schnelleres Bestellerlebnis.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <Input
                  label="Vollständiger Name"
                  placeholder="Max Mustermann"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  leftIcon={<User size={18} className="text-gray-400" />}
                  error={errors.fullName}
                  required
                />
                <Input
                  label="Telefonnummer"
                  placeholder="+49 172 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  leftIcon={<Phone size={18} className="text-gray-400" />}
                  error={errors.phone}
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Input
            label="E-Mail-Adresse"
            type="email"
            placeholder="name@beispiel.de"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            leftIcon={<Mail size={18} className="text-gray-400" />}
            error={errors.email}
            required
          />

          <Input
            label="Passwort"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            leftIcon={<Lock size={18} className="text-gray-400" />}
            error={errors.password}
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={isLoading}
            className="mt-2"
          >
            {isLogin ? 'Anmelden' : 'Registrieren'}
            {!isLoading && <ArrowRight size={18} className="ml-2" />}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-gray-500">
            {isLogin ? 'Noch kein Konto?' : 'Bereits ein Konto?'}
          </span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 font-bold text-[#142328] hover:underline"
          >
            {isLogin ? 'Jetzt registrieren' : 'Hier anmelden'}
          </button>
        </div>

        {isLogin && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl text-green-700 text-xs">
              <CheckCircle size={14} className="shrink-0" />
              <p>Spare Zeit beim Checkout durch gespeicherte Adressen.</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
