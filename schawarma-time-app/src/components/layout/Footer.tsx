import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { useRestaurantStore } from '@/store/restaurantStore'

export function Footer() {
  const { settings } = useRestaurantStore()
  const restaurantName = settings?.name || 'Schawarma-Time'
  const address = settings?.address || 'Adresse nicht hinterlegt'
  const phone = settings?.phone || '05069 8067500'
  const email = settings?.email || 'info@schawarma-time.de'
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const labels: Record<(typeof days)[number], string> = {
    sunday: 'Sonntag',
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
  }
  const todayKey = days[new Date().getDay()]
  const todayHours = settings?.hours?.[todayKey]
  const openingText = !todayHours || todayHours.is_closed
    ? 'Heute geschlossen'
    : `${labels[todayKey]} · ${todayHours.open} – ${todayHours.close}`

  return (
    <footer className="bg-[#142328] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl font-black">{restaurantName}</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              {restaurantName} - direkt online bestellen.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Kontakt</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#06c167]" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={15} className="shrink-0 text-[#06c167]" />
                <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="hover:text-white transition-colors">{phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="shrink-0 text-[#06c167]" />
                <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
              </li>
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Öffnungszeiten</h3>
            <p className="text-sm text-gray-400">{openingText}</p>
            <div className="flex items-center gap-1.5 mt-3">
              <Clock size={13} className="text-[#06c167]" />
              <span className="text-xs text-gray-500">Lieferung bis 30 Min. vor Schließung</span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link></li>
              <li><Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutzerklärung</Link></li>
              <li><Link to="/agb" className="hover:text-white transition-colors">AGB</Link></li>
              <li><Link to="/cookie-einstellungen" className="hover:text-white transition-colors">Cookie-Einstellungen</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© 2026 {restaurantName}. Alle Rechte vorbehalten.</p>
          <p>{settings?.is_halal_certified ? 'Halal zertifiziert 🌱' : 'Online bestellen'}</p>
        </div>
      </div>
    </footer>
  )
}
