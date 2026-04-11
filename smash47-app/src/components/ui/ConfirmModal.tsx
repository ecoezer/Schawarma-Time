import { cn } from '@/lib/utils'
import { Modal } from './Modal'

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
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6">
        <p className="text-[15px] text-[#545454] leading-relaxed mb-6">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={cn(
              'w-full py-4 text-[16px] font-bold rounded-xl transition-colors',
              isDangerous ? 'bg-[#ff2d55] text-white hover:bg-[#ff3b30]' : 'bg-black text-white hover:bg-zinc-800'
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
      </div>
    </Modal>
  )
}
