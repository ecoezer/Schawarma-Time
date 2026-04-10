import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Product } from '@/types'
import { formatPrice, cn } from '@/lib/utils'

interface ProductCardProps {
  product: Product
  onClick: (product: Product) => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const [imgError, setImgError] = useState(false)

  // Reset error state whenever the image URL changes (e.g. after admin uploads a new image)
  useEffect(() => {
    setImgError(false)
  }, [product.image_url])

  // Detect if product is a drink or sauce to use object-contain (prevents cropping bottles/cups)
  const isDrink = product.name.toLowerCase().includes('drink') || product.name.toLowerCase().includes('getränk')
  
  const hasImage = !imgError && !!product.image_url

  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      onClick={() => product.is_active && onClick(product)}
      className={cn(
        'group flex flex-row items-stretch bg-white cursor-pointer rounded-xl border border-[#e8e8e8] hover:shadow-md transition-all overflow-hidden h-[120px] md:h-[140px] w-full',
        !product.is_active && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Left: Text Content */}
      <div className="flex-1 flex flex-col min-w-0 p-4 justify-center">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[16px] font-bold text-black leading-tight tracking-tight">
            {product.name}
          </h3>
          <div className="text-[14px] font-medium text-black mt-1">
            {formatPrice(product.price)}
          </div>
          {product.description && (
            <div className="mt-1 text-[13px] text-[#545454] line-clamp-2 leading-snug">
              {product.description}
            </div>
          )}
        </div>
      </div>

      {/* Right: Image — only shown when image exists */}
      {hasImage && (
        <div
          className="relative shrink-0 bg-[#f3f3f3] h-full overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: '1.25' }}
        >
          <div className="w-full h-full relative">
            <img
              src={product.image_url!}
              alt={product.name}
              onError={() => setImgError(true)}
              className={cn(
                "w-full h-full transition-transform duration-500 group-hover:scale-105",
                isDrink ? "object-contain p-2" : "object-cover"
              )}
              loading="lazy"
            />
            {!product.is_active && (
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center z-10">
                <span className="bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded text-black uppercase">
                  Offline
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offline badge when no image */}
      {!hasImage && !product.is_active && (
        <div className="shrink-0 flex items-center pr-4">
          <span className="bg-gray-100 text-[10px] font-bold px-2 py-0.5 rounded text-black uppercase">
            Offline
          </span>
        </div>
      )}
    </motion.div>
  )
}

