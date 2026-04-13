import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Phone, ArrowRight, CheckCircle, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import * as authService from '@/services/authService'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Alle Supabase-Fehlermeldungen auf Deutsch übersetzen
function translateAuthError(err: any): string {
  const msg = err?.message ?? ''
  const code = err?.code ?? ''
  if (msg === 'Failed to fetch') return 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.'
  if (code === 'email_address_invalid' || msg.toLowerCase().includes('invalid email')) return 'Ungültige E-Mail-Adresse.'
  if (code === 'weak_password') return 'Das Passwort ist zu schwach (min. 10 Zeichen).'
  if (code === 'email_not_confirmed' || msg.toLowerCase().includes('email not confirmed')) return '__resend__'
  if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid credentials') || code === 'invalid_credentials') return 'Falsche E-Mail-Adresse oder falsches Passwort.'
  if (msg.toLowerCase().includes('user already registered') || code === 'user_already_exists') return 'Diese E-Mail-Adresse ist bereits registriert.'
  if (msg.toLowerCase().includes('too many requests') || code === 'over_request_rate_limit') return 'Zu viele Versuche. Bitte warte einen Moment.'
  if (msg.toLowerCase().includes('user not found')) return 'Kein Konto mit dieser E-Mail-Adresse gefunden.'
  if (msg.toLowerCase().includes('password')) return 'Das Passwort ist ungültig.'
  if (msg) return msg
  return 'Ein Fehler ist aufgetreten.'
}

export function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { setUser, setSession, user, isInitialized } = useAuthStore()

  if (isInitialized && user) {
    toast('Du bist bereits angemeldet!', { icon: 'ℹ️' })
    navigate('/', { replace: true })
    return null
  }

  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showResend, setShowResend] = useState(false)
  const [isResending, setIsResending] = useState(false)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!formData.email) errs.email = 'E-Mail ist erforderlich'
    if (!formData.password) errs.password = 'Passwort ist erforderlich'
    else if (!isLogin && formData.password.length < 10) errs.password = 'Passwort muss mindestens 10 Zeichen lang sein'
    if (!isLogin) {
      if (!formData.fullName) errs.fullName = 'Name ist erforderlich'
      if (!formData.phone) {
        errs.phone = 'Telefon ist erforderlich'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleResendConfirmation = async () => {
    setIsResending(true)
    try {
      const { error } = await import('@/lib/supabase').then(m =>
        m.supabase.auth.resend({ type: 'signup', email: formData.email })
      )
      if (error) throw error
      toast.success('Bestätigungs-E-Mail wurde erneut gesendet. Bitte prüfe dein Postfach.', { duration: 6000 })
      setShowResend(false)
    } catch {
      toast.error('E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.')
    } finally {
      setIsResending(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) { toast.error('Bitte gib deine E-Mail-Adresse ein.'); return }
    setIsSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/passwort-zuruecksetzen`,
      })
      if (error) throw error
      setResetSent(true)
    } catch (err: any) {
      toast.error(translateAuthError(err))
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    setShowResend(false)
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      if (isLogin) {
        const data = await authService.signIn(formData.email, formData.password)

        // Fetch profile
        const profile = await authService.fetchProfile(data.user.id)

        setSession(data.session)
        setUser(profile)
        const isAdmin = ['manager', 'cashier', 'kitchen'].includes(profile?.role ?? '')
        toast.success(`Willkommen zurück, ${profile?.full_name?.split(' ')[0] || 'Gast'}! 👋`)
        navigate(isAdmin ? '/admin' : redirect, { replace: true })
      } else {
        const data = await authService.signUp(formData.email, formData.password, {
          full_name: formData.fullName,
          phone: formData.phone,
        })

        if (data.user) {
          if (data.session) {
            setSession(data.session)
            const profile = await authService.fetchProfile(data.user.id)
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
      const message = translateAuthError(err)
      if (message === '__resend__') { setShowResend(true); return }
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
            {isForgotPassword ? 'Passwort zurücksetzen' : isLogin ? 'Willkommen zurück' : 'Konto erstellen'}
          </h1>
          <p className="text-gray-500 mt-2">
            {isForgotPassword
              ? 'Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.'
              : isLogin
              ? 'Melde dich an, um mit deiner Bestellung fortzufahren.'
              : 'Erstelle ein Konto für ein schnelleres Bestellerlebnis.'}
          </p>
        </div>

        {/* ── PASSWORT VERGESSEN ─────────────────────────────────── */}
        {isForgotPassword && (
          <>
            {resetSent ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <p className="text-center text-gray-700 font-medium">
                  Wir haben dir einen Link zum Zurücksetzen des Passworts an <strong>{forgotEmail}</strong> gesendet.
                </p>
                <p className="text-center text-sm text-gray-500">Bitte prüfe auch deinen Spam-Ordner.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input
                  label="E-Mail-Adresse"
                  type="email"
                  placeholder="name@beispiel.de"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  leftIcon={<Mail size={18} className="text-gray-400" />}
                  required
                />
                <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isSendingReset}>
                  <KeyRound size={16} />
                  Link senden
                </Button>
              </form>
            )}
            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsForgotPassword(false); setResetSent(false); setForgotEmail('') }}
                className="text-sm font-bold text-[#142328] hover:underline"
              >
                ← Zurück zur Anmeldung
              </button>
            </div>
          </>
        )}

        {/* ── LOGIN / REGISTER ───────────────────────────────────── */}
        {!isForgotPassword && (

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

          <div>
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
            {isLogin && (
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setForgotEmail(formData.email) }}
                  className="text-xs font-medium text-gray-500 hover:text-[#142328] hover:underline transition-colors"
                >
                  Passwort vergessen?
                </button>
              </div>
            )}
          </div>

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

          {showResend && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
              <p className="font-semibold mb-1">E-Mail nicht bestätigt</p>
              <p className="mb-3">Bitte bestätige zuerst deine E-Mail-Adresse. Keine E-Mail erhalten?</p>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={isResending}
                className="font-bold underline hover:text-yellow-900 disabled:opacity-50"
              >
                {isResending ? 'Wird gesendet...' : 'Bestätigungs-E-Mail erneut senden'}
              </button>
            </div>
          )}
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
        </> {/* end !isForgotPassword */}
      </motion.div>
    </div>
  )
}
