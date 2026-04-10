import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Monitor, Smartphone, Image as ImageIcon, RotateCcw, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface ImageCropModalProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  onConfirm: (croppedUrl: string) => void
}

// Helper: generate a cropped image via canvas
function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  canvas.width = crop.width * scaleX
  canvas.height = crop.height * scaleY

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas
}

// Generate a preview URL from a crop
function getPreviewUrl(
  image: HTMLImageElement | null,
  crop: PixelCrop | null
): string | null {
  if (!image || !crop || !crop.width || !crop.height) return null
  try {
    const canvas = getCroppedCanvas(image, crop)
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch {
    return null
  }
}

export function ImageCropModal({ isOpen, imageUrl, onClose, onConfirm }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // When image loads, set a default centered crop
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    imgRef.current = img
    const { width, height } = img

    // Default: center crop with 4:3 aspect
    const defaultCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 4 / 3, width, height),
      width,
      height
    )
    setCrop(defaultCrop)
  }, [])

  // Update preview when crop changes
  useEffect(() => {
    if (completedCrop && imgRef.current) {
      const url = getPreviewUrl(imgRef.current, completedCrop)
      setPreviewUrl(url)
    }
  }, [completedCrop])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCrop(undefined)
      setCompletedCrop(null)
      setPreviewUrl(null)
      setIsProcessing(false)
      imgRef.current = null
    }
  }, [isOpen])

  const handleReset = () => {
    if (!imgRef.current) return
    const { width, height } = imgRef.current
    const defaultCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 4 / 3, width, height),
      width,
      height
    )
    setCrop(defaultCrop)
  }

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return
    setIsProcessing(true)
    try {
      const canvas = getCroppedCanvas(imgRef.current, completedCrop)
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas to blob failed'))),
          'image/jpeg',
          0.92
        )
      })

      // Upload cropped image to Cloudinary
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

      if (cloudName && uploadPreset) {
        const formData = new FormData()
        formData.append('file', blob, 'cropped.jpg')
        formData.append('upload_preset', uploadPreset)

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData }
        )

        if (!response.ok) throw new Error('Upload fehlgeschlagen')
        const data = await response.json()

        // Build optimized URL
        const urlParts = data.secure_url.split('/upload/')
        const finalUrl = urlParts.length === 2
          ? `${urlParts[0]}/upload/f_auto,q_auto,w_800/${urlParts[1]}`
          : data.secure_url

        onConfirm(finalUrl)
      } else {
        // No Cloudinary — use data URL as fallback
        onConfirm(canvas.toDataURL('image/jpeg', 0.92))
      }
    } catch (err) {
      console.error('Crop error:', err)
      // Fallback: use original image
      onConfirm(imageUrl)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  const displayPreview = previewUrl || imageUrl

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#142328] rounded-xl flex items-center justify-center">
                <ImageIcon size={16} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Bild zuschneiden</h2>
                <p className="text-xs text-gray-500">Wähle den Bildausschnitt für die Produktkarte</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Crop Area */}
            <div className="flex-1 min-w-0 p-6 flex flex-col items-center justify-center bg-gray-50 overflow-auto">
              <div className="max-w-md w-full">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  className="max-w-full rounded-xl overflow-hidden shadow-lg"
                >
                  <img
                    src={imageUrl}
                    alt="Zuschneiden"
                    onLoad={onImageLoad}
                    className="max-w-full max-h-[50vh] block"
                    crossOrigin="anonymous"
                  />
                </ReactCrop>
                <div className="flex items-center justify-center mt-3">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-white"
                  >
                    <RotateCcw size={13} />
                    Zurücksetzen
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Previews */}
            <div className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 p-6 overflow-y-auto bg-white">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Vorschau</h3>

              {/* Desktop ProductCard Preview */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Desktop — Produktkarte</span>
                </div>
                <div className="flex flex-row items-stretch bg-white rounded-xl border border-[#e8e8e8] overflow-hidden h-[140px] w-full shadow-sm">
                  <div className="flex-1 flex flex-col min-w-0 p-3 justify-center">
                    <div className="h-3.5 w-3/4 bg-gray-200 rounded mb-1.5" />
                    <div className="h-3 w-1/3 bg-gray-200 rounded mb-1" />
                    <div className="h-2.5 w-2/3 bg-gray-100 rounded" />
                  </div>
                  <div
                    className="relative shrink-0 bg-[#f3f3f3] h-full overflow-hidden"
                    style={{ aspectRatio: '1.25' }}
                  >
                    <img
                      src={displayPreview}
                      alt="Desktop preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile ProductCard Preview */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mobil — Produktkarte</span>
                </div>
                <div className="flex flex-row items-stretch bg-white rounded-xl border border-[#e8e8e8] overflow-hidden h-[120px] w-full shadow-sm">
                  <div className="flex-1 flex flex-col min-w-0 p-3 justify-center">
                    <div className="h-3 w-3/4 bg-gray-200 rounded mb-1.5" />
                    <div className="h-2.5 w-1/4 bg-gray-200 rounded mb-1" />
                    <div className="h-2 w-1/2 bg-gray-100 rounded" />
                  </div>
                  <div
                    className="relative shrink-0 bg-[#f3f3f3] h-full overflow-hidden"
                    style={{ aspectRatio: '1.25' }}
                  >
                    <img
                      src={displayPreview}
                      alt="Mobile preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Detail Preview */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Produktdetail</span>
                </div>
                <div className="bg-[#f3f3f3] rounded-xl overflow-hidden aspect-square shadow-sm">
                  <img
                    src={displayPreview}
                    alt="Detail preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Hint */}
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
                <span className="font-bold">Tipp:</span> Ziehe den Rahmen im Bild, um den sichtbaren Bereich für Produktkarten und Details festzulegen.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
            <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleConfirm}
                isLoading={isProcessing}
                disabled={!completedCrop || isProcessing}
              >
                <Check size={16} />
                Zuschnitt bestätigen
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
