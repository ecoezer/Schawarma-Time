import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#142328] text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl font-black">Schawarma-Time</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Die besten Smash Burger in Hildesheim – frisch, saftig und unwiderstehlich!
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Kontakt</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#06c167]" />
                <span>Bahnhofsallee 14a,<br />31134 Hildesheim</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={15} className="shrink-0 text-[#06c167]" />
                <a href="tel:051213030551" className="hover:text-white transition-colors">05121 3030551</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={15} className="shrink-0 text-[#06c167]" />
                <a href="mailto:info@schawarma-time.de" className="hover:text-white transition-colors">info@schawarma-time.de</a>
              </li>
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-gray-300">Öffnungszeiten</h3>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li className="flex justify-between gap-4">
                <span>Mo – Do</span>
                <span>11:30 – 22:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Fr – Sa</span>
                <span>11:30 – 23:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Sonntag</span>
                <span>11:30 – 22:00</span>
              </li>
            </ul>
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
          <p>© 2026 Schawarma-Time. Alle Rechte vorbehalten.</p>
          <p>Halal zertifiziert 🌱 · Hildesheim, Deutschland</p>
        </div>
      </div>
    </footer>
  )
}
