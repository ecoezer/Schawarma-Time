import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  isDangerous = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
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
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6 flex flex-col"
          >
            <h3 className="text-[20px] font-bold text-black mb-2">
              {title}
            </h3>
            <p className="text-[15px] text-[#545454] leading-relaxed mb-6">
              {message}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={cn(
                  "w-full py-4 text-[16px] font-bold rounded-xl transition-colors",
                  isDangerous 
                    ? "bg-[#ff2d55] text-white hover:bg-[#ff3b30]" 
                    : "bg-black text-white hover:bg-zinc-800"
                )}
              >
                {confirmText}
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 text-[16px] font-bold text-black bg-[#f6f6f6] rounded-xl hover:bg-[#efefef] transition-colors"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
