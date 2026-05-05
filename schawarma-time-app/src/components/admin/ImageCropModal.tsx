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
  onConfirm: (croppedUrl: string, modalUrl?: string) => void
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
  crop: PixelCrop, // We will treat this as percentages
  rotation: number,
  contain: boolean = false,
  targetAspect: number = CARD_ASPECT,
  zoom: number = 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const imgW = image.naturalWidth || 100
  const imgH = image.naturalHeight || 100
  
  // Holder aspect is what the user is cropping against
  const holderAspect = targetAspect || (imgW / imgH)
  
  // Logical holder dimensions (in image pixels)
  let holderW = imgW
  let holderH = imgH
  if (imgW / imgH > holderAspect) {
    holderH = imgW / holderAspect
  } else {
    holderW = imgH * holderAspect
  }

  // Set canvas size (proportional to crop percentage of holder)
  const finalW = (crop.width / 100) * holderW
  const finalH = (crop.height / 100) * holderH
  
  canvas.width = Math.max(1, finalW)
  canvas.height = Math.max(1, finalH)

  // 1. Fill background
  ctx.fillStyle = '#f9f9f9'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 2. Setup transformation
  ctx.save()
  
  // Move to the logical center of the holder on the canvas
  // If crop starts at 10% and width is 80%, holder center (50%) is at (50-10)/80 of canvas
  const centerX = ((50 - crop.x) / crop.width) * canvas.width
  const centerY = ((50 - crop.y) / crop.height) * canvas.height
  
  ctx.translate(centerX, centerY)
  ctx.rotate((rotation * Math.PI) / 180)
  
  // Scale factor to map image pixels to canvas pixels
  // baseScale makes image fit in holder
  const baseScale = Math.min(holderW / imgW, holderH / imgH)
  // zoom is the user's manual scale
  // scaleToCanvas maps holder pixels to canvas pixels
  const scaleToCanvas = canvas.width / (crop.width / 100 * holderW)
  
  const finalScale = scaleToCanvas * baseScale * zoom
  
  ctx.drawImage(
    image,
    -imgW / 2 * finalScale,
    -imgH / 2 * finalScale,
    imgW * finalScale,
    imgH * finalScale
  )
  
  ctx.restore()
  return canvas
}

export function ImageCropModal({ isOpen, imageUrl, onClose, onConfirm, productInfo }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const isProcessingRef = useRef(false)
  const [rotation, setRotation] = useState(0)
  const [isContainMode, setIsContainMode] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [modalZoom, setModalZoom] = useState(1)
  const [activePreset, setActivePreset] = useState(0) // Default to "Produktkarte" (index 0)
  const [imageSrc, setImageSrc] = useState('')
  const [previewUrlModal, setPreviewUrlModal] = useState<string | null>(null)
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

    // Initially, we just set the image as the "active" reference
    // The container will handle the actual crop bounds
    if (img) {
      const aspect = activeAspect || CARD_ASPECT
      const defaultCrop = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, 100, 100), // Percent of container
        100, 100
      )
      setCrop(defaultCrop)
    }
  }, [activeAspect])

  // Update Previews
  useEffect(() => {
    if (!completedCrop || !imgRef.current || !imageLoaded) return

    try {
      // Generate Card Image
      const canvasCard = getCroppedCanvas(imgRef.current, completedCrop, rotation, isContainMode, activeAspect || CARD_ASPECT, zoom)
      setPreviewUrl(canvasCard.toDataURL('image/jpeg', 0.9))

      // Generate Modal Image
      const canvasModal = getCroppedCanvas(imgRef.current, completedCrop, rotation, isContainMode, 1, modalZoom)
      setPreviewUrlModal(canvasModal.toDataURL('image/jpeg', 0.9))
    } catch (err) {
      console.warn('Preview error:', err)
      setPreviewUrl(null)
      setPreviewUrlModal(null)
    }
  }, [completedCrop, rotation, imageLoaded, isContainMode, activeAspect, zoom, modalZoom])

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCrop(undefined)
      setCompletedCrop(null)
      setPreviewUrl(null)
      setPreviewUrlModal(null)
      setRotation(0)
      setIsContainMode(false)
      setZoom(1)
      setModalZoom(1)
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
    setIsContainMode(false)
    setZoom(1)
    setModalZoom(1)
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
    if (isProcessingRef.current) return   // çift tıklama / double-trigger guard
    isProcessingRef.current = true
    setIsProcessing(true)
    try {
      // Generate Card Image
      const canvasCard = getCroppedCanvas(imgRef.current, completedCrop, rotation, isContainMode, activeAspect || CARD_ASPECT, zoom)
      const blobCard = await new Promise<Blob>((resolve, reject) => {
        canvasCard.toBlob(b => b ? resolve(b) : reject(new Error('Blob failed')), 'image/jpeg', 0.92)
      })

      // Generate Modal Image
      const canvasModal = getCroppedCanvas(imgRef.current, completedCrop, rotation, isContainMode, 1, modalZoom)
      const blobModal = await new Promise<Blob>((resolve, reject) => {
        canvasModal.toBlob(b => b ? resolve(b) : reject(new Error('Blob failed')), 'image/jpeg', 0.92)
      })

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

      if (cloudName && uploadPreset) {
        const upload = async (blob: Blob) => {
          const formData = new FormData()
          formData.append('file', blob, 'cropped.jpg')
          formData.append('upload_preset', uploadPreset)
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST', body: formData,
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data?.error?.message || 'Upload fehlgeschlagen')
          return data.secure_url as string
        }

        const [urlCard, urlModal] = await Promise.all([
          upload(blobCard),
          upload(blobModal)
        ])

        onConfirm(urlCard, urlModal)
      } else {
        onConfirm(canvasCard.toDataURL('image/jpeg', 0.92), canvasModal.toDataURL('image/jpeg', 0.92))
      }
    } catch (err) {
      console.error('Crop/Upload error:', err)
    } finally {
      isProcessingRef.current = false
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

                {/* Zoom Sliders */}
                <div className="flex items-center gap-4 pl-3 border-l border-gray-100 flex-1">
                  {/* Card Zoom */}
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-gray-400 leading-none mb-1">Karte</span>
                      <div className="flex items-center gap-2">
                        <ImageIcon size={12} className="text-gray-400 shrink-0" />
                        <input
                          type="range"
                          min="0.1"
                          max="2.0"
                          step="0.05"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#142328]"
                        />
                        <span className="text-[10px] font-mono text-gray-500 w-8 text-right shrink-0">
                          {Math.round(zoom * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Modal Zoom */}
                  <div className="flex items-center gap-2 pl-4 border-l border-gray-100 min-w-[140px]">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-gray-400 leading-none mb-1">Detail (Modal)</span>
                      <div className="flex items-center gap-2">
                        <ImageIcon size={12} className="text-gray-400 shrink-0" />
                        <input
                          type="range"
                          min="0.1"
                          max="2.0"
                          step="0.05"
                          value={modalZoom}
                          onChange={(e) => setModalZoom(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1a6b3d]"
                        />
                        <span className="text-[10px] font-mono text-gray-500 w-8 text-right shrink-0">
                          {Math.round(modalZoom * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rotation controls */}
                <div className="flex items-center gap-1 pl-3 border-l border-gray-100">
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

                {/* Contain Toggle */}
                <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
                  <button
                    onClick={() => setIsContainMode(!isContainMode)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      isContainMode 
                        ? 'bg-[#e7f3ee] text-[#1a6b3d] ring-1 ring-[#1a6b3d]/20'
                        : 'text-gray-500 hover:bg-gray-100'
                    )}
                    title="Das Bild in den gewählten Rahmen einpassen (Hintergrund füllen)"
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      isContainMode ? 'bg-[#1a6b3d] border-[#1a6b3d]' : 'bg-white border-gray-300'
                    )}>
                      {isContainMode && <Check size={12} className="text-white" />}
                    </div>
                    Einpassen
                  </button>
                </div>
              </div>

              {/* Crop Canvas */}
              <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                <div className="max-w-xl w-full">
                  {imageSrc ? (
                    <div className="bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                      {/* The "Holder" container that defines the crop area */}
                      <ReactCrop
                        crop={crop}
                        onChange={(c, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c, percentCrop) => setCompletedCrop(percentCrop)}
                        aspect={activeAspect}
                        className="w-full rounded-xl overflow-hidden bg-[#f9f9f9] border border-gray-200"
                        style={{ aspectRatio: activeAspect ? `${activeAspect}` : '1.25' }}
                      >
                        <div className="w-full h-full flex items-center justify-center p-8 min-h-[300px]">
                          <img
                            src={imageSrc}
                            alt="Zuschneiden"
                            onLoad={onImageLoad}
                            className="max-w-full max-h-full object-contain transition-all duration-200 ease-out shadow-sm"
                            style={{ 
                              transform: `scale(${zoom}) rotate(${rotation}deg)`,
                              transformOrigin: 'center center'
                            }}
                            crossOrigin="anonymous"
                          />
                        </div>
                      </ReactCrop>
                    </div>
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
                  </div>
                  <div
                    className="relative shrink-0 bg-[#f3f3f3] h-full overflow-hidden"
                    style={{ aspectRatio: '1.25' }}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={24} className="text-gray-200" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile ProductCard */}
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
                  </div>
                  <div
                    className="relative shrink-0 bg-[#f3f3f3] h-full overflow-hidden"
                    style={{ aspectRatio: '1.25' }}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={20} className="text-gray-200" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ProductModal Detail Preview */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={14} className="text-gray-400" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Produktdetail (Modal)</span>
                </div>
                <div className="bg-[#f3f3f3] rounded-xl overflow-hidden aspect-square shadow-sm flex items-center justify-center">
                  {previewUrlModal ? (
                    <img src={previewUrlModal} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={48} className="text-gray-200" />
                  )}
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
