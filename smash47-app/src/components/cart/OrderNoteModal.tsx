import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface OrderNoteModalProps {
  isOpen: boolean
  onClose: () => void
  initialNote: string
  onSave: (note: string) => void
}

export function OrderNoteModal({ isOpen, onClose, initialNote, onSave }: OrderNoteModalProps) {
  const [note, setNote] = useState(initialNote)

  useEffect(() => {
    if (isOpen) {
      setNote(initialNote)
    }
  }, [isOpen, initialNote])

  const handleSave = () => {
    onSave(note)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="relative h-[72px] flex items-center justify-center border-b border-gray-100">
              <button
                onClick={onClose}
                className="absolute left-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} className="text-black" />
              </button>
              <h2 className="text-[18px] font-bold text-black">Bestellnotiz hinzufügen</h2>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="bg-[#f6f6f6] rounded-2xl p-4 min-h-[160px] border border-transparent focus-within:border-black transition-colors">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Gib an, ob du Besteck, Servietten, Strohhalme und Gewürze haben möchtest, oder hinterlasse spezielle Hinweise, die das Restaurant beachten soll."
                  className="w-full h-full bg-transparent outline-none resize-none text-[16px] text-black placeholder:text-[#545454] leading-relaxed"
                  rows={5}
                />
              </div>
              
              <p className="mt-4 text-[14px] text-black">
                Dir werden möglicherweise zusätzliche Kosten berechnet.
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 pt-0">
              <button
                onClick={handleSave}
                className="w-full py-4 bg-black text-white text-[18px] font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Speichern
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
