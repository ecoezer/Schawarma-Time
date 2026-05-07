import { MapPin, Clock, Copy, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { RestaurantSettings } from '@/types'

interface MapSectionProps {
  settings: RestaurantSettings
}

export function MapSection({ settings }: MapSectionProps) {
  const addressParts = settings.address
    ? settings.address.split(',').map((part) => part.trim()).filter(Boolean)
    : []
  const primaryAddress = addressParts[0] || 'Adresse nicht hinterlegt'
  const secondaryAddress = addressParts.slice(1).join(', ') || 'Deutschland'
  const todayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
  const todayHours = settings.hours?.[todayKey]
  const todayText = !todayHours || todayHours.is_closed
    ? 'Heute geschlossen'
    : `Geöffnet bis ${todayHours.close}`

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
    <div className="w-full bg-white mb-6">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        <div className="flex flex-col md:flex-row w-full border border-gray-200 rounded-xl overflow-hidden h-auto md:h-[180px]">
          
          {/* Map Image Placeholder (Left Side) */}
          <a 
            href={`https://www.google.com/maps?q=${encodeURIComponent(settings.address || settings.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-[3] relative bg-[#e5e3df] overflow-hidden min-h-[140px] block hover:opacity-90 transition-opacity"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-[#ece7df] via-[#e5e3df] to-[#d7d1c7]" />
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,#ffffff_0,transparent_22%),radial-gradient(circle_at_75%_60%,#ffffff_0,transparent_18%),linear-gradient(120deg,transparent_0%,transparent_42%,#cbd5e1_42%,#cbd5e1_45%,transparent_45%,transparent_100%)]" />
             
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 hidden sm:block">
               <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                 <path d="M 10 40 Q 40 10 90 20" fill="transparent" stroke="#2563eb" strokeWidth="4" strokeDasharray="6,6" />
                 <circle cx="10" cy="40" r="5" fill="black" />
                 <circle cx="90" cy="20" r="5" fill="black" />
               </svg>
               <div className="absolute top-[5px] left-[35px] bg-white rounded shadow px-2 py-1 text-[13px] font-bold text-black border border-gray-200">
                 Standort
               </div>
             </div>
          </a>

          {/* Details (Right Side) */}
          <div className="flex-[2] bg-white flex flex-col min-w-[340px]">
            {/* Address Row */}
            <div className="flex-1 flex justify-between items-center px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 group">
              <div className="flex items-start gap-4">
                <MapPin size={20} className="text-black mt-0.5" />
                  <div>
                  <h3 className="text-base font-bold text-black">{primaryAddress}</h3>
                  <p className="text-[14px] text-[#545454] mt-0.5">{secondaryAddress}</p>
                </div>
              </div>
              <button 
                onClick={(event) => {
                  event.preventDefault()
                  void copyAddress()
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors"
                title="Adresse kopieren"
              >
                <Copy size={16} className="text-black" />
              </button>
            </div>

            {/* Hours Row */}
            <div className="flex-1 flex justify-between items-center px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-start gap-4">
                <Clock size={20} className="text-black mt-0.5" />
                <div>
                  <h3 className="text-base font-bold text-black">Öffnungszeiten</h3>
                  <p className="text-[14px] text-[#545454] mt-0.5">{todayText}</p>
                </div>
              </div>
              <ChevronDown size={20} className="text-black" />
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
