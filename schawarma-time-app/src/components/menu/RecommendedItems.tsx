import { useRef } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Product } from '@/types'

interface RecommendedItemsProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

export function RecommendedItems({ products, onProductClick }: RecommendedItemsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Explicit order matching the user's screenshot exactly
  // Page 1: Smash Burger, Menü 5, Menü 1, Triple Smash, Chili Cheese Pommes
  // Page 2: Smash Pastirma Burger, Köfte Baguette, Menü 2, Pommes (groß), Triple Smash Burger 47
  const exactOrderIds = [
    'p1', 'p22', 'p18', 'p4', 'p12', // Page 1
    'p3', 'p10', 'p19', 'p13', 'p5'  // Page 2
  ]
  const recommendedProducts = exactOrderIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as Product[]

  if (recommendedProducts.length === 0) return null

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const scrollAmount = container.clientWidth
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const scrollAmount = container.clientWidth
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-[#142328] tracking-tight">Empfohlene Artikel</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={scrollLeft}
            className="p-3 rounded-full bg-gray-100 text-[#142328] hover:bg-gray-200 transition-colors shadow-sm"
            aria-label="Zurück"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={scrollRight}
            className="p-3 rounded-full bg-gray-100 text-[#142328] hover:bg-gray-200 transition-colors shadow-sm"
            aria-label="Weiter"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-none pb-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recommendedProducts.map((product, index) => (
          <div
            key={product.id}
            onClick={() => onProductClick(product)}
            className="shrink-0 w-[calc(100%-40px)] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)] cursor-pointer group snap-start"
          >
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#f6f6f6]">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-xs text-center px-4">Kein Bild verfügbar</span>
                </div>
              )}
              {/* Badge */}
              <div className="absolute top-2 left-2 bg-[#1b8c4c] text-white text-[12px] px-2 py-0.5 rounded-sm shadow-sm font-semibold tracking-tight z-10">
                Beliebtester: {index + 1}
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-[16px] leading-[1.3] font-bold text-[#142328] line-clamp-2 min-h-[42px]">{product.name}</h3>
              <p className="text-[14px] text-[#545454] mt-1">
                {product.price.toLocaleString('de-DE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
