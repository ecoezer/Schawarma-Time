import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import type { RestaurantSettings } from '@/types'

interface RestaurantInfoModalProps {
  isOpen: boolean
  onClose: () => void
  settings: RestaurantSettings
}

export function RestaurantInfoModal({ isOpen, onClose, settings }: RestaurantInfoModalProps) {
  // Opening hours helper
  const days = [
    { key: 'monday', name: 'Montag' },
    { key: 'tuesday', name: 'Dienstag' },
    { key: 'wednesday', name: 'Mittwoch' },
    { key: 'thursday', name: 'Donnerstag' },
    { key: 'friday', name: 'Freitag' },
    { key: 'saturday', name: 'Samstag' },
    { key: 'sunday', name: 'Sonntag' },
  ]

  const addressParts = settings.address
    ? settings.address.split(',').map((part) => part.trim()).filter(Boolean)
    : []
  const primaryAddress = addressParts[0] || 'Adresse nicht hinterlegt'
  const secondaryAddress = addressParts.slice(1).join(', ')
  const tags = settings.tags?.length ? settings.tags : ['Restaurant']

  const copyAddress = async () => {
    const addressToCopy = settings.address || settings.name
    if (!addressToCopy) return

    try {
      await navigator.clipboard.writeText(addressToCopy)
      toast.success('Adresse kopiert')
    } catch {
      toast.error('Adresse konnte nicht kopiert werden')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-[540px] max-h-[90vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col z-[1100]"
          >
            {/* Header with Map or fallback */}
            <div className="relative h-[220px] bg-[#f3f3f3] shrink-0 overflow-hidden">
              {settings.is_map_mode_active ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ece7df] via-[#e5e3df] to-[#d7d1c7]" />
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,#ffffff_0,transparent_22%),radial-gradient(circle_at_75%_60%,#ffffff_0,transparent_18%),linear-gradient(120deg,transparent_0%,transparent_42%,#cbd5e1_42%,#cbd5e1_45%,transparent_45%,transparent_100%)]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24">
                    <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                      <path d="M 10 40 Q 40 10 90 20" fill="transparent" stroke="#2563eb" strokeWidth="4" strokeDasharray="6,6" />
                      <circle cx="10" cy="40" r="5" fill="black" />
                      <circle cx="90" cy="20" r="5" fill="black" />
                    </svg>
                    <div className="absolute top-[5px] left-[35px] bg-white rounded shadow px-2 py-1 text-[13px] font-bold text-black border border-gray-200">
                      Standort
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none">
                   <div className="text-[120px] font-black uppercase text-black rotate-[-15deg]">
                     {settings.name.split('-')[0]}
                   </div>
                </div>
              )}

              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors z-10"
              >
                <X size={24} className="text-black" />
              </button>
            </div>

            {/* Content Section (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pt-6 pb-8">
              <h2 className="text-[32px] font-bold text-black leading-tight mb-1">{settings.name}</h2>
              <p className="text-[15px] text-[#545454] font-medium mb-6">
                {tags.join(' • ')}
              </p>

              {/* Info Rows */}
              <div className="space-y-1">
                {/* Address Row */}
                <div className="flex items-center justify-between py-4 border-b border-gray-100 group cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors">
                  <div className="flex items-start gap-4">
                    <MapPin size={24} className="text-black mt-0.5" />
                    <div>
                      <p className="text-[16px] font-semibold text-black leading-tight">
                        {primaryAddress}
                      </p>
                      {secondaryAddress && (
                        <p className="text-[14px] text-[#545454] mt-0.5">
                          {secondaryAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => void copyAddress()}
                    className="p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100"
                  >
                    <Copy size={20} />
                  </button>
                </div>
              </div>

              {/* Opening Hours Section */}
              <div className="mt-8">
                <h3 className="text-[20px] font-bold text-black mb-4">Öffnungszeiten</h3>
                <div className="space-y-3">
                  {days.map((day) => (
                    <div key={day.key} className="flex justify-between items-center text-[15px]">
                      <span className="text-black font-medium">{day.name}</span>
                      <span className="text-[#545454]">
                        {!settings.hours?.[day.key] || settings.hours[day.key].is_closed
                          ? 'Geschlossen'
                          : `${settings.hours[day.key].open} - ${settings.hours[day.key].close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impressum Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-[20px] font-bold text-black mb-4">Impressum</h3>
                <div className="text-[14px] text-[#545454] leading-relaxed space-y-4">
                  <div>
                    <h4 className="font-bold text-black text-[15px] mb-1">Angaben gemäß § 5 TMG</h4>
                    <p>{settings.name}<br />{settings.address || 'Adresse nicht hinterlegt'}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-black text-[15px] mb-1">Kontakt</h4>
                    <p>Telefon: {settings.phone || 'Nicht hinterlegt'}<br />E-Mail: {settings.email || 'Nicht hinterlegt'}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
