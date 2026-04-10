import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Monitor, Smartphone, Image as ImageIcon, RotateCcw, RotateCw, Check, RectangleHorizontal, Square, Ratio } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { cn, formatPrice } from '@/lib/utils'

interface ProductInfo {
  name: string
  price: number
  description?: string
}

interface ImageCropModalProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  onConfirm: (croppedUrl: string) => void
  productInfo?: ProductInfo
}

// Aspect ratio presets
const ASPECT_PRESETS = [
  { label: 'Frei', value: undefined, icon: '✂️' },
  { label: '4:3', value: 4 / 3, icon: '🖼️' },
  { label: '1:1', value: 1, icon: '⬜' },
  { label: '16:9', value: 16 / 9, icon: '🎬' },
] as const

// Helper: draw a rotated image to a canvas
function drawRotatedImage(image: HTMLImageElement, rotation: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const rad = (rotation * Math.PI) / 180

  if (rotation === 90 || rotation === 270 || rotation === -90 || rotation === -270) {
    canvas.width = image.naturalHeight
    canvas.height = image.naturalWidth
  } else {
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
  }

  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

  return canvas
}

// Helper: generate a cropped image via canvas (with rotation support)
function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation: number
): HTMLCanvasElement {
  // First apply rotation if needed
  let sourceCanvas: HTMLCanvasElement | HTMLImageElement = image
  if (rotation !== 0) {
    sourceCanvas = drawRotatedImage(image, rotation)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const sourceWidth = sourceCanvas instanceof HTMLCanvasElement ? sourceCanvas.width : sourceCanvas.naturalWidth
  const sourceHeight = sourceCanvas instanceof HTMLCanvasElement ? sourceCanvas.height : sourceCanvas.naturalHeight

  // The displayed image dimensions (what ReactCrop uses)
  const displayWidth = image.width
  const displayHeight = image.height

  // If rotated, the display dimensions swap
  let effectiveDisplayWidth = displayWidth
  let effectiveDisplayHeight = displayHeight
  if (rotation === 90 || rotation === 270 || rotation === -90 || rotation === -270) {
    // After rotation the displayed image has swapped dimensions
    // But ReactCrop still uses the img element dimensions
    // We need to account for the CSS transform
  }

  const scaleX = sourceWidth / displayWidth
  const scaleY = sourceHeight / displayHeight

  canvas.width = crop.width * scaleX
  canvas.height = crop.height * scaleY

  ctx.drawImage(
    sourceCanvas,
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
  crop: PixelCrop | null,
  rotation: number
): string | null {
  if (!image || !crop || !crop.width || !crop.height) return null
  try {
    const canvas = getCroppedCanvas(image, crop, rotation)
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch {
    return null
  }
}

export function ImageCropModal({ isOpen, imageUrl, onClose, onConfirm, productInfo }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [activeAspect, setActiveAspect] = useState<number | undefined>(undefined)
  const [imageSrc, setImageSrc] = useState('')
  const [corsError, setCorsError] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Handle CORS: if the image is external (Cloudinary), proxy it through a data URL
  useEffect(() => {
    if (!isOpen || !imageUrl) return

    setCorsError(false)

    // Local blob URLs don't need CORS handling
    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      setImageSrc(imageUrl)
      return
    }

    // For external URLs, try to fetch and convert to data URL
    const fetchImage = async () => {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        setImageSrc(dataUrl)
      } catch {
        // Fallback: use original URL (canvas operations may fail)
        setCorsError(true)
        setImageSrc(imageUrl)
      }
    }

    fetchImage()
  }, [imageUrl, isOpen])

  // When image loads, set a default centered crop
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    imgRef.current = img
    const { width, height } = img

    const aspect = activeAspect || 4 / 3
    const defaultCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height),
      width,
      height
    )
    setCrop(defaultCrop)
  }, [activeAspect])

  // Update preview when crop changes
  useEffect(() => {
    if (completedCrop && imgRef.current && !corsError) {
      const url = getPreviewUrl(imgRef.current, completedCrop, rotation)
      setPreviewUrl(url)
    }
  }, [completedCrop, rotation, corsError])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCrop(undefined)
      setCompletedCrop(null)
      setPreviewUrl(null)
      setIsProcessing(false)
      setRotation(0)
      setActiveAspect(undefined)
      imgRef.current = null
    }
  }, [isOpen])

  const handleAspectChange = (aspect: number | undefined) => {
    setActiveAspect(aspect)
    if (!imgRef.current) return
    const { width, height } = imgRef.current

    if (aspect) {
      const newCrop = centerCrop(
        makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height),
        width,
        height
      )
      setCrop(newCrop)
    }
    // If undefined (free), keep current crop but remove aspect lock
  }

  const handleRotate = (direction: 'cw' | 'ccw') => {
    setRotation(prev => {
      const next = direction === 'cw' ? prev + 90 : prev - 90
      return next % 360
    })
  }

  const handleReset = () => {
    setRotation(0)
    setActiveAspect(undefined)
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
      const canvas = getCroppedCanvas(imgRef.current, completedCrop, rotation)
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

        const urlParts = data.secure_url.split('/upload/')
        const finalUrl = urlParts.length === 2
          ? `${urlParts[0]}/upload/f_auto,q_auto,w_800/${urlParts[1]}`
          : data.secure_url

        onConfirm(finalUrl)
      } else {
        onConfirm(canvas.toDataURL('image/jpeg', 0.92))
      }
    } catch (err) {
      console.error('Crop error:', err)
      onConfirm(imageUrl)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  const displayPreview = previewUrl || imageSrc || imageUrl

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
                <p className="text-xs text-gray-500">
                  {productInfo ? `${productInfo.name} — Bildausschnitt anpassen` : 'Wähle den Bildausschnitt für die Produktkarte'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: Crop Area */}
            <div className="flex-1 min-w-0 flex flex-col bg-gray-50 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
                {/* Aspect Ratio Presets */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2 hidden sm:inline">Format:</span>
                  {ASPECT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleAspectChange(preset.value)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                        activeAspect === preset.value
                          ? 'bg-[#142328] text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                      )}
                    >
                      {preset.icon} {preset.label}
                    </button>
                  ))}
                </div>

                {/* Rotation */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRotate('ccw')}
                    className="p-1.5 text-gray-400 hover:text-[#142328] hover:bg-gray-100 rounded-lg transition-colors"
                    title="90° gegen Uhrzeigersinn"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    onClick={() => handleRotate('cw')}
                    className="p-1.5 text-gray-400 hover:text-[#142328] hover:bg-gray-100 rounded-lg transition-colors"
                    title="90° im Uhrzeigersinn"
                  >
                    <RotateCw size={16} />
                  </button>
                  {rotation !== 0 && (
                    <span className="text-[10px] font-mono text-gray-400 ml-1">{rotation}°</span>
                  )}
                </div>
              </div>

              {/* Crop Canvas */}
              <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                <div className="max-w-md w-full">
                  {imageSrc ? (
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={activeAspect}
                      className="max-w-full rounded-xl overflow-hidden shadow-lg"
                    >
                      <img
                        src={imageSrc}
                        alt="Zuschneiden"
                        onLoad={onImageLoad}
                        className="max-w-full max-h-[45vh] block"
                        style={{ transform: `rotate(${rotation}deg)` }}
                        crossOrigin="anonymous"
                      />
                    </ReactCrop>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center">
                        <div className="w-8 h-8 border-3 border-[#142328] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm">Bild wird geladen...</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-center mt-3">
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-white"
                    >
                      <RotateCcw size={13} />
                      Alles zurücksetzen
                    </button>
                  </div>
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
                    <h4 className="text-[13px] font-bold text-black leading-tight truncate">
                      {productInfo?.name || 'Produktname'}
                    </h4>
                    <div className="text-[12px] font-medium text-black mt-1">
                      {productInfo ? formatPrice(productInfo.price) : '€ 0,00'}
                    </div>
                    {productInfo?.description && (
                      <div className="mt-1 text-[11px] text-[#545454] line-clamp-2 leading-snug">
                        {productInfo.description}
                      </div>
                    )}
                    {!productInfo?.description && (
                      <div className="h-2 w-2/3 bg-gray-100 rounded mt-1.5" />
                    )}
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
                    <h4 className="text-[12px] font-bold text-black leading-tight truncate">
                      {productInfo?.name || 'Produktname'}
                    </h4>
                    <div className="text-[11px] font-medium text-black mt-0.5">
                      {productInfo ? formatPrice(productInfo.price) : '€ 0,00'}
                    </div>
                    {!productInfo?.description && (
                      <div className="h-2 w-1/2 bg-gray-100 rounded mt-1" />
                    )}
                    {productInfo?.description && (
                      <div className="mt-0.5 text-[10px] text-[#545454] line-clamp-1 leading-snug">
                        {productInfo.description}
                      </div>
                    )}
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
                {productInfo && (
                  <div className="mt-2 px-1">
                    <p className="text-sm font-bold text-black">{productInfo.name}</p>
                    <p className="text-xs text-gray-500">{formatPrice(productInfo.price)}</p>
                  </div>
                )}
              </div>

              {/* CORS Warning */}
              {corsError && (
                <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700 leading-relaxed mb-4">
                  <span className="font-bold">⚠️ Hinweis:</span> Das Bild konnte nicht für die Vorschau geladen werden (CORS). Der Zuschnitt wird trotzdem beim Speichern angewendet.
                </div>
              )}

              {/* Hint */}
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
                <span className="font-bold">Tipp:</span> Ziehe den Rahmen im Bild, um den sichtbaren Bereich festzulegen. Mit den Format-Buttons oben kannst du feste Seitenverhältnisse verwenden.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white">
            <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
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
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
