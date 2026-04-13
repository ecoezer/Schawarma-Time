import { useState } from 'react'
import { Heart, MoreHorizontal, Info, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RestaurantSettings } from '@/types'
import { RestaurantInfoModal } from './RestaurantInfoModal'

interface HeroSectionProps {
  settings: RestaurantSettings
}

type DeliveryMode = 'lieferung' | 'abholung'

export function HeroSection({ settings }: HeroSectionProps) {
  const imageUrl = settings.hero_images?.[0] || 'https://via.placeholder.com/1200x400'
  const [mode, setMode] = useState<DeliveryMode>('lieferung')
  const [showFeesModal, setShowFeesModal] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  const isAbholung = mode === 'abholung'

  return (
    <div className="w-full bg-white pt-1 pb-6">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Banner Image Container */}
        <div className="relative w-full h-[192px] sm:h-[256px] rounded-2xl overflow-hidden bg-gray-100 group">
          <img 
            src={imageUrl} 
            alt={settings.name} 
            className="w-full h-full object-cover"
          />
          
          {/* Top Right Action Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer text-black">
              <Heart size={20} />
            </button>
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer text-black">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="flex flex-col lg:flex-row justify-between items-start mt-6">

          {/* Left: Text Content */}
          <div className="flex-1 pr-4 text-center lg:text-left">
            <h1 className="text-[36px] font-bold text-black tracking-tight mb-2 leading-none">
              {settings.name}
            </h1>

            {/* Meta tags line */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-1.5 text-[15px] font-medium text-gray-800 mb-2.5">
              <span>{settings.delivery_fee === 0 ? 'Kostenlos' : `${settings.delivery_fee.toFixed(2).replace('.', ',')} €`} Liefergebühr</span>
              {(settings.tags?.length ? settings.tags : ['Food', 'Burger', 'Street Food']).map((tag) => (
                <span key={tag} className="flex items-center gap-1.5">
                  <span className="text-gray-400 font-normal">•</span>
                  <span>{tag}</span>
                </span>
              ))}
              <span className="text-gray-400 font-normal">•</span>
              <button
                onClick={() => setShowInfoModal(true)}
                className="underline decoration-1 underline-offset-2 text-black hover:text-gray-600"
              >
                Informationen
              </button>
            </div>

            {/* Sub-info text block */}
            <div className="space-y-1">
              <p className="text-[14px] text-[#545454]">
                Der Mindestbestellwert in diesem Geschäft beträgt {settings.min_order_amount} €.
              </p>
              {settings.description && (
                <p className="text-[14px] text-[#545454]">{settings.description}</p>
              )}
              <p className="text-[14px] text-[#545454]">
                {settings.address}
              </p>
            </div>

            {/* Announcement */}
            {settings.is_announcement_active && settings.announcement && (
              <div className="mt-4 bg-gray-100 rounded-lg p-3 text-sm font-medium text-gray-800 inline-block">
                {settings.announcement}
              </div>
            )}
          </div>

          {/* Right: Widgets */}
          <div className="flex flex-col items-center lg:items-end gap-5 mt-6 lg:mt-0 shrink-0 w-full lg:w-auto">

            {/* Delivery Toggle */}
            <div className="relative flex items-center bg-[#f0f0f0] rounded-full p-1 overflow-hidden">
              <motion.div
                className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm"
                style={{ width: 'calc(50% - 4px)' }}
                animate={{ left: mode === 'lieferung' ? 4 : '50%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
              <button
                onClick={() => setMode('lieferung')}
                className={`relative z-10 px-6 py-2 rounded-full text-[15px] font-semibold transition-colors duration-200 ${
                  mode === 'lieferung' ? 'text-black' : 'text-[#6b6b6b] hover:text-black'
                }`}
              >
                Lieferung
              </button>
              <button
                onClick={() => setMode('abholung')}
                className={`relative z-10 px-6 py-2 rounded-full text-[15px] font-semibold transition-colors duration-200 ${
                  mode === 'abholung' ? 'text-black' : 'text-[#6b6b6b] hover:text-black'
                }`}
              >
                Abholung
              </button>
            </div>

            {/* Fee & Time Widget */}
            <div className="flex border border-gray-200 rounded-xl shadow-sm w-full overflow-hidden">
              {/* Left cell — fee */}
              <div
                className="flex-1 border-r border-gray-200 px-4 py-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setShowFeesModal(true)}
              >
                <AnimatePresence mode="wait">
                  <motion.p
                    key={isAbholung ? 'fee-abholung' : 'fee-lieferung'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="font-bold text-[15px] text-black"
                  >
                    {isAbholung ? '0,00 €' : (settings.delivery_fee === 0 ? '0,00 €' : `${settings.delivery_fee.toFixed(2).replace('.', ',')} €`)}
                  </motion.p>
                </AnimatePresence>
                <p className="text-[13px] text-[#8a8a8a] flex items-center gap-1 mt-0.5 whitespace-nowrap">
                  Sonstige Gebühren <Info size={13} className="text-gray-400" />
                </p>
              </div>
              {/* Right cell — time */}
              <div className="flex-1 px-4 py-4 flex flex-col items-center justify-center text-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={isAbholung ? 'time-abholung' : 'time-lieferung'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="font-bold text-[15px] text-black"
                  >
                    {isAbholung ? '5 Min.' : `${settings.estimated_delivery_time} Min.`}
                  </motion.p>
                </AnimatePresence>
                {/* Render both labels, invisible trick keeps box size stable */}
                <div className="relative mt-0.5">
                  <p className={`text-[13px] text-[#8a8a8a] whitespace-nowrap ${isAbholung ? 'invisible' : ''}`}>
                    Früheste Ankunftszeit
                  </p>
                  <AnimatePresence>
                    {isAbholung && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="text-[13px] text-[#8a8a8a] whitespace-nowrap absolute inset-0 flex items-center justify-center"
                      >
                        Abholzeit
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SONSTIGE GEBÜHREN MODAL */}
      <AnimatePresence>
        {showFeesModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeesModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-[480px] rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col z-[1100]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[24px] font-bold text-black tracking-tight">Sonstige Gebühren</h2>
                <button 
                  onClick={() => setShowFeesModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-black" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar text-[15px] leading-relaxed text-black">
                <div>
                  <p>
                    <strong>Liefergebühr:</strong> Diese Gebühr ist abhängig von deinem Standort. Du zahlst weniger bei Restaurants in deiner Nähe.
                  </p>
                </div>

                <div>
                  <p>
                    <strong>Gebühr für kleine Bestellungen:</strong> Diese fällt bei Bestellungen mit einem Gesamtbetrag von unter 12 € an. Diese Gebühr kann vermieden werden, indem du mehr Artikel zu deinem Warenkorb hinzufügst. Bestimmte Restaurant-Partner*innen und Geschäfte haben möglicherweise einen höheren Schwellenwert.
                  </p>
                </div>
              </div>

              {/* Footer Button */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowFeesModal(false)}
                  className="bg-black text-white text-[16px] font-bold px-7 py-3 rounded-xl hover:bg-black/90 active:scale-[0.98] transition-all shadow-md"
                >
                  Fertig
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <RestaurantInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)}
        settings={settings}
      />
    </div>
  )
}
