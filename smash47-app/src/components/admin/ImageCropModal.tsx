import { useState, useRef, useCallback, useEffect } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { X, Monitor, Smartphone, Image as ImageIcon, RotateCcw, RotateCw, Check } from 'lucide-react'
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

// The ProductCard image container uses aspectRatio: 1.25 (5:4)
// This is the EXACT ratio we need to match for pixel-perfect previews
const CARD_ASPECT = 5 / 4

// Aspect ratio presets — "Produktkarte" matches the actual card
const ASPECT_PRESETS = [
  { label: 'Produktkarte', value: CARD_ASPECT, desc: '5:4 — empfohlen' },
  { label: 'Quadrat', value: 1, desc: '1:1' },
  { label: 'Breit', value: 16 / 9, desc: '16:9' },
  { label: 'Frei', value: undefined, desc: 'beliebig' },
] as const

// Helper: generate a cropped canvas from image + crop area
function getCroppedCanvas(
  image: HTMLImageElement,
  crop: PixelCrop,
  rotation: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // For rotation, we draw the rotated image onto a temp canvas first
  let source: HTMLCanvasElement | HTMLImageElement = image
  if (rotation !== 0) {
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')!
    const rad = (rotation * Math.PI) / 180
    const isSwapped = Math.abs(rotation % 180) === 90

    tempCanvas.width = isSwapped ? image.naturalHeight : image.naturalWidth
    tempCanvas.height = isSwapped ? image.naturalWidth : image.naturalHeight

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2)
    tempCtx.rotate(rad)
    tempCtx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
    source = tempCanvas
  }

  const sourceW = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth
  const sourceH = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight

  // Scale from display coords to natural coords
  const scaleX = sourceW / image.width
  const scaleY = sourceH / image.height

  const cropX = crop.x * scaleX
  const cropY = crop.y * scaleY
  const cropW = crop.width * scaleX
  const cropH = crop.height * scaleY

  canvas.width = cropW
  canvas.height = cropH

  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  return canvas
}

export function ImageCropModal({ isOpen, imageUrl, onClose, onConfirm, productInfo }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [activePreset, setActivePreset] = useState(0) // Default to "Produktkarte" (index 0)
  const [imageSrc, setImageSrc] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const activeAspect = ASPECT_PRESETS[activePreset].value

  // Handle CORS: convert external URLs to data URLs for canvas access
  useEffect(() => {
    if (!isOpen || !imageUrl) return
    setImageLoaded(false)

    if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      setImageSrc(imageUrl)
      return
    }

    // Fetch external image and convert to data URL to avoid CORS
    const fetchImage = async () => {
      try {
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const reader = new FileReader()
        reader.onloadend = () => setImageSrc(reader.result as string)
        reader.readAsDataURL(blob)
      } catch {
        // Fallback: use URL directly
        setImageSrc(imageUrl)
      }
    }
    fetchImage()
  }, [imageUrl, isOpen])

  // When image loads, set default crop with ProductCard aspect ratio
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    imgRef.current = img
    setImageLoaded(true)

    const { width, height } = img
    const aspect = activeAspect || CARD_ASPECT
    const defaultCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 85 }, aspect, width, height),
      width, height
    )
    setCrop(defaultCrop)
  }, [activeAspect])

  // Update preview whenever crop or rotation changes
  useEffect(() => {
    if (!completedCrop || !imgRef.current || !imageLoaded) return
    if (!completedCrop.width || !completedCrop.height) return

    try {
      const canvas = getCroppedCanvas(imgRef.current, completedCrop, rotation)
      setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9))
    } catch {
      setPreviewUrl(null)
    }
  }, [completedCrop, rotation, imageLoaded])

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCrop(undefined)
      setCompletedCrop(null)
      setPreviewUrl(null)
      setIsProcessing(false)
      setRotation(0)
      setActivePreset(0) // Default: Produktkarte
      setImageLoaded(false)
      imgRef.current = null
    }
  }, [isOpen])

  const handlePresetChange = (idx: number) => {
    setActivePreset(idx)
    if (!imgRef.current) return
    const { width, height } = imgRef.current
    const aspect = ASPECT_PRESETS[idx].value

    if (aspect) {
      setCrop(centerCrop(
        makeAspectCrop({ unit: '%', width: 85 }, aspect, width, height),
        width, height
      ))
    }
  }

  const handleRotate = (dir: 'cw' | 'ccw') => {
    setRotation(prev => (dir === 'cw' ? prev + 90 : prev - 90) % 360)
  }

  const handleReset = () => {
    setRotation(0)
    setActivePreset(0)
    if (!imgRef.current) return
    const { width, height } = imgRef.current
    setCrop(centerCrop(
      makeAspectCrop({ unit: '%', width: 85 }, CARD_ASPECT, width, height),
      width, height
    ))
  }

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return
    setIsProcessing(true)
    try {
      const canvas = getCroppedCanvas(imgRef.current, completedCrop, rotation)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob failed')), 'image/jpeg', 0.92)
      })

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

      if (cloudName && uploadPreset) {
        const formData = new FormData()
        formData.append('file', blob, 'cropped.jpg')
        formData.append('upload_preset', uploadPreset)

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST', body: formData,
        })
        if (!res.ok) throw new Error('Upload fehlgeschlagen')
        const data = await res.json()

        const parts = data.secure_url.split('/upload/')
        const finalUrl = parts.length === 2
          ? `${parts[0]}/upload/f_auto,q_auto,w_800/${parts[1]}`
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

  // The preview image: use cropped version if available, otherwise original
  const preview = previewUrl || imageSrc || imageUrl

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

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
                  {productInfo ? `${productInfo.name} — Bildausschnitt anpassen` : 'Bildausschnitt für die Produktkarte wählen'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT: Crop Area */}
            <div className="flex-1 min-w-0 flex flex-col bg-gray-50 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white shrink-0 gap-2 flex-wrap">
                {/* Aspect Ratio Presets */}
                <div className="flex items-center gap-1">
                  {ASPECT_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetChange(idx)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                        activePreset === idx
                          ? 'bg-[#142328] text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      {preset.label}
                      <span className="opacity-60 ml-1 font-normal">{preset.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Rotation controls */}
                <div className="flex items-center gap-1">
                  <button onClick={() => handleRotate('ccw')}
                    className="p-1.5 text-gray-400 hover:text-[#142328] hover:bg-gray-100 rounded-lg transition-colors"
                    title="90° gegen Uhrzeigersinn">
                    <RotateCcw size={16} />
                  </button>
                  <button onClick={() => handleRotate('cw')}
                    className="p-1.5 text-gray-400 hover:text-[#142328] hover:bg-gray-100 rounded-lg transition-colors"
                    title="90° im Uhrzeigersinn">
                    <RotateCw size={16} />
                  </button>
                  {rotation !== 0 && (
                    <span className="text-[10px] font-mono text-gray-400 ml-0.5">{rotation}°</span>
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
                      className="max-w-full rounded-xl overflow-hidden shadow-lg [&_.ReactCrop__crop-selection]:!border-[#142328] [&_.ReactCrop__crop-selection]:!border-2"
                    >
                      <img
                        src={imageSrc}
                        alt="Zuschneiden"
                        onLoad={onImageLoad}
                        className="max-w-full max-h-[45vh] block"
                        style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
                        crossOrigin="anonymous"
                      />
                    </ReactCrop>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-400">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-[#142328] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm">Bild wird geladen...</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-center mt-3">
                    <button onClick={handleReset}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-white">
                      <RotateCcw size={13} />
                      Zurücksetzen
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Live Previews — PIXEL-PERFECT match to actual ProductCard */}
            <div className="w-full lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 p-5 overflow-y-auto bg-white">
              <h3 className="text-sm font-bold text-gray-900 mb-4">So wird es aussehen</h3>

              {/* Desktop ProductCard — EXACT match to ProductCard.tsx */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor size={14} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Desktop</span>
                </div>
                {/* 
                  This is an EXACT replica of ProductCard.tsx:
                  - Container: h-[140px], rounded-xl, border, overflow-hidden
                  - Image container: shrink-0, h-full, aspectRatio 1.25, bg-[#f3f3f3]
                  - Image: object-cover, w-full, h-full
                */}
                <div className="flex flex-row items-stretch bg-white rounded-xl border border-[#e8e8e8] overflow-hidden h-[140px] w-full shadow-sm">
                  <div className="flex-1 flex flex-col min-w-0 p-4 justify-center">
                    <h4 className="text-[16px] font-bold text-black leading-tight tracking-tight truncate">
                      {productInfo?.name || 'Produktname'}
                    </h4>
                    <div className="text-[14px] font-medium text-black mt-1">
                      {productInfo ? formatPrice(productInfo.price) : '€ 0,00'}
                    </div>
                    {productInfo?.description ? (
                      <div className="mt-1 text-[13px] text-[#545454] line-clamp-2 leading-snug">
                        {productInfo.description}
                      </div>
                    ) : (
                      <div className="mt-1 text-[13px] text-[#545454] line-clamp-2 leading-snug opacity-40">
                        Beschreibung...
                      </div>
                    )}
                  </div>
                  <div
                    className="relative shrink-0 bg-[#f3f3f3] h-full overflow-hidden"
                    style={{ aspectRatio: '1.25' }}
                  >
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Mobile ProductCard — EXACT match to ProductCard.tsx mobile */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone size={14} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Mobil</span>
                </div>
                <div className="flex flex-row items-stretch bg-white rounded-xl border border-[#e8e8e8] overflow-hidden h-[120px] w-full shadow-sm">
                  <div className="flex-1 flex flex-col min-w-0 p-4 justify-center">
                    <h4 className="text-[16px] font-bold text-black leading-tight tracking-tight truncate">
                      {productInfo?.name || 'Produktname'}
                    </h4>
                    <div className="text-[14px] font-medium text-black mt-1">
                      {productInfo ? formatPrice(productInfo.price) : '€ 0,00'}
                    </div>
                    {productInfo?.description ? (
                      <div className="mt-1 text-[13px] text-[#545454] line-clamp-2 leading-snug">
                        {productInfo.description}
                      </div>
                    ) : (
                      <div className="mt-1 text-[13px] text-[#545454] line-clamp-2 leading-snug opacity-40">
                        Beschreibung...
                      </div>
                    )}
                  </div>
                  <div
                    className="relative shrink-0 bg-[#f3f3f3] h-full overflow-hidden"
                    style={{ aspectRatio: '1.25' }}
                  >
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* ProductModal Detail Preview */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={14} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Produktdetail (Modal)</span>
                </div>
                <div className="bg-[#f3f3f3] rounded-xl overflow-hidden aspect-square shadow-sm">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                </div>
                {productInfo && (
                  <div className="mt-2 px-0.5">
                    <p className="text-[15px] font-bold text-black">{productInfo.name}</p>
                    <p className="text-[13px] text-gray-500">{formatPrice(productInfo.price)}</p>
                  </div>
                )}
              </div>

              {/* Help text */}
              <div className="bg-[#f0f8f4] rounded-xl p-3 text-xs text-[#1a6b3d] leading-relaxed">
                <span className="font-bold">💡 Empfehlung:</span> Verwende das Format „Produktkarte (5:4)" für die beste Darstellung. So sieht das Bild exakt so aus wie auf der Website.
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
