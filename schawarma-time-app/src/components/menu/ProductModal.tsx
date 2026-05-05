import { useState, useEffect, useRef } from 'react'
import { X, Share2, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Product, CartExtra } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { useRestaurantStore } from '@/store/restaurantStore'
import { formatPrice, cn, isRestaurantOpen } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface ProductModalProps {
  product: Product | null
  onClose: () => void
}

export function ProductModal({ product, onClose }: ProductModalProps) {
   const [selectedExtras, setSelectedExtras] = useState<CartExtra[]>([])
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const [isClosedWarningOpen, setIsClosedWarningOpen] = useState(false)
  const [transformOrigin, setTransformOrigin] = useState('50% 50%')
  const { addItem } = useCartStore()
  const { settings } = useRestaurantStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (product) {
      setSelectedExtras([])
      setQuantity(1)
      setNote('')
      setShowStickyHeader(false)
      // Default to first size if available
      if (product.sizes?.length > 0) {
        setSelectedSizeId(product.sizes[0].id)
      } else {
        setSelectedSizeId(null)
      }
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0
      }
    }
  }, [product?.id])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100
    setTransformOrigin(`${x}% ${y}%`)
  }

  const handleMouseLeave = () => {
    setTransformOrigin('50% 50%')
  }

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!product) return null

  const toggleExtra = (extra: { id: string; name: string; price: number }, group: any) => {
    setSelectedExtras((prev) => {
      const isSelected = prev.some((e) => e.id === extra.id)
      
      if (group.max_select === 1) {
        if (isSelected && !group.required) {
          return prev.filter((e) => e.id !== extra.id)
        }
        const withoutGroup = prev.filter(
          (e) => !group.extras.some((x: any) => x.id === e.id)
        )
        return [...withoutGroup, { 
          id: extra.id, 
          name: extra.name, 
          price: extra.price,
          group_name: group.name 
        }]
      }

      if (isSelected) {
        return prev.filter((e) => e.id !== extra.id)
      }

      const currentInGroup = prev.filter((e) =>
        group.extras.some((x: any) => x.id === e.id)
      ).length

      if (group.max_select && currentInGroup >= group.max_select) {
        return prev
      }

      return [...prev, { 
        id: extra.id, 
        name: extra.name, 
        price: extra.price,
        group_name: group.name
      }]
    })
  }

  const isExtraSelected = (extraId: string) => selectedExtras.some((e) => e.id === extraId)
  
  const isGroupSatisfied = (group: any) => {
    if (!group.required) return true
    return selectedExtras.some((e) => group.extras.some((x: any) => x.id === e.id))
  }

   const selectedSize = product.sizes?.find(s => s.id === selectedSizeId)
  const basePrice = selectedSize ? selectedSize.price : product.price
  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0)
  const totalPrice = (basePrice + extrasTotal) * quantity
  
  const isSizeValid = product.sizes?.length > 0 ? !!selectedSizeId : true
  const isGroupsValid = product.extra_groups.every((group) => isGroupSatisfied(group))
  const isValid = isSizeValid && isGroupsValid

  const handleAddToCart = () => {
    if (!isValid) return
    
    const isRestaurantOpenNow = settings ? isRestaurantOpen(settings.hours) : false
    if (!isRestaurantOpenNow) {
      setIsClosedWarningOpen(true)
      return
    }

    const success = addItem({
      product_id: product.id,
      name: product.name,
      price: basePrice, // Use size price if available
      image_url: product.image_url,
      quantity,
      selected_extras: selectedExtras,
      selected_size_id: selectedSizeId ?? undefined,
      selected_size_name: selectedSize?.name,
      note,
    }, settings)

    if (success) {
      toast.success(`${product.name} wurde hinzugefügt!`)
      onClose()
    }
  }

  const isDrink = product?.category_id === 'cat6' || product?.category_id === 'cat7' || product?.name.toLowerCase().includes('drink')

  return (
    <>
      <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 lg:p-12 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative w-full h-full md:max-w-5xl md:h-[90vh] bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header Buttons */}
          <div className="absolute top-4 left-4 flex z-[120]">
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <X size={20} className="text-black" />
            </button>
          </div>
          <div className="absolute top-4 right-4 flex z-[120]">
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Share2 size={18} className="text-black" />
            </button>
          </div>

          {/* Sticky Header Bar (Appears on scroll) */}
          <div 
            className={cn(
              "absolute top-0 left-0 right-0 h-[72px] bg-white border-b border-[#e8e8e8] z-[115] flex items-center justify-center px-16 transition-opacity duration-300 pointer-events-none",
              showStickyHeader ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="font-bold text-[16px] text-black truncate text-center">
              {product.name}
            </div>
          </div>

          {/* Main Content Area (Two Columns) */}
          <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden relative">
            {/* LEFT COLUMN: Image Segment */}
            <div className="w-full h-[56vw] min-h-[220px] max-h-[320px] md:h-auto md:w-[42%] lg:w-[45%] flex-shrink-0 relative overflow-y-auto hidden-scrollbar bg-white md:bg-transparent p-0 md:pt-14 md:pl-2 md:pr-1 lg:pl-3 lg:pr-2">
              <div 
                ref={imageContainerRef}
                className="w-full h-full md:aspect-square md:sticky md:top-14 bg-[#f3f3f3] md:rounded-lg overflow-hidden flex items-center justify-center group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {product.image_url_modal || product.image_url ? (
                  <img
                    src={product.image_url_modal || product.image_url || undefined}
                    alt={product.name}
                    style={{ transformOrigin }}
                    className={cn(
                      "w-full h-full transition-transform duration-[400ms] ease-out group-hover:scale-[1.75]",
                      isDrink ? "object-contain p-6" : "object-cover"
                    )}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-4xl uppercase opacity-20">
                    Schawarma-Time
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Content Segment */}
            <div 
              ref={scrollRef}
              className="flex-1 flex flex-col w-full h-full bg-white relative overflow-y-auto overscroll-contain"
              onScroll={(e) => setShowStickyHeader(e.currentTarget.scrollTop > 80)}
            >
              
              <div className="flex-1 w-full flex flex-col pt-6 md:pt-14 pb-12">
                
                {/* Product Info Block */}
                <div className="px-6 md:pl-3 md:pr-10 mb-8">
                  <h1 className="text-[32px] md:text-[40px] font-bold text-black tracking-tight leading-tight mb-2">
                    {product.name}
                  </h1>
                  <div className="text-[18px] md:text-[20px] font-medium text-black mb-3">
                    {formatPrice(product.price)}
                  </div>
                  {product.description && (
                    <div className="text-[15px] md:text-[16px] text-[#545454] leading-relaxed mb-4">
                      {product.description}
                    </div>
                  )}
                  
                   {/* Popularity Tag */}
                  <div className="inline-flex items-center justify-center bg-[#f3f3f3] px-3 py-1.5 rounded-md mt-1">
                    <span className="text-[13px] font-medium text-black tracking-tight">Beliebtester: 3</span>
                  </div>
                </div>

                {/* Sizes Selection */}
                {product.sizes?.length > 0 && (
                  <div className="w-full mb-4">
                    <div className="px-6 md:pl-3 md:pr-10 py-6 bg-white shrink-0 mt-2">
                      <div className="text-[24px] md:text-[28px] font-bold text-black tracking-tight leading-tight">
                        Größe wählen
                      </div>
                      <div className="text-[15px] text-[#545454] mt-1">
                        Verpflichtend
                      </div>
                    </div>
                    <div className="flex flex-col w-full">
                      {product.sizes.map((size) => {
                        const isSelected = selectedSizeId === size.id
                        return (
                          <div 
                            key={size.id} 
                            className="w-full px-6 md:pl-3 md:pr-10 flex flex-col group/item transition-colors hover:bg-[#f6f6f6] cursor-pointer" 
                            onClick={() => setSelectedSizeId(size.id)}
                          >
                             <hr className="border-[#e8e8e8] border-t-1 m-0" />
                             <div className="w-full flex items-center justify-between py-5">
                               <div className="flex-1 pr-6 flex flex-col">
                                 <div className="text-[16px] font-medium text-black">
                                   {size.name}
                                 </div>
                                 <div className="text-[14px] text-[#545454] mt-1">
                                   {formatPrice(size.price)}
                                 </div>
                               </div>
                               <div className="shrink-0 flex items-center justify-center">
                                 <div className={cn(
                                   "w-[24px] h-[24px] border-[3px] rounded-full transition-all flex items-center justify-center",
                                   isSelected ? "border-black bg-black" : "border-[#545454] group-hover:border-black"
                                 )}>
                                   {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                 </div>
                               </div>
                             </div>
                          </div>
                        )
                      })}
                      <div className="px-6 md:pl-3 md:pr-10"><hr className="border-[#e8e8e8] border-t-1 m-0" /></div>
                    </div>
                  </div>
                )}

                {/* Selection Options Groups */}
                <ul className="flex flex-col w-full list-none p-0 m-0">
                  {product.extra_groups.map((group) => {
                    return (
                      <li key={group.id} className="w-full">
                        {/* Section Title */}
                        <div className="px-6 md:pl-3 md:pr-10 py-6 bg-white shrink-0 mt-2">
                          <div className="text-[24px] md:text-[28px] font-bold text-black tracking-tight leading-tight">
                            {group.name}
                          </div>
                          <div className="text-[15px] text-[#545454] mt-1">
                            Wähle bis zu {group.max_select || 1}
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="flex flex-col w-full">
                          {group.extras.map((extra) => {
                            const isSelected = isExtraSelected(extra.id)
                            return (
                              <div key={extra.id} className="w-full px-6 md:pl-3 md:pr-10 flex flex-col group/item transition-colors hover:bg-[#f6f6f6] cursor-pointer" onClick={() => toggleExtra(extra, group)}>
                                 <hr className="border-[#e8e8e8] border-t-1 m-0" />
                                 <div className="w-full flex items-center justify-between py-5">
                                   {/* Label Info */}
                                   <div className="flex-1 pr-6 flex flex-col">
                                     <div className="text-[16px] font-medium text-black">
                                       {extra.name}
                                     </div>
                                     {extra.price > 0 && (
                                       <div className="text-[14px] text-[#545454] mt-1">
                                         + {formatPrice(extra.price)}
                                       </div>
                                     )}
                                     <button 
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         toast('Info: Nährwerte & Allergene in Kürze.', { icon: 'ℹ️', style: { borderRadius: '10px', background: '#333', color: '#fff' } })
                                       }}
                                       className="text-[13px] text-[#545454] underline mt-1.5 w-fit hover:text-black transition-colors"
                                     >
                                       Produktinfo
                                     </button>
                                   </div>

                                   {/* Checkbox / Radio */}
                                   <div className="shrink-0 flex items-center justify-center">
                                     <div className={cn(
                                       "w-[24px] h-[24px] border-[3px] transition-all flex items-center justify-center",
                                       group.max_select === 1 ? "rounded-[50%]" : "rounded-sm",
                                       isSelected ? "border-black bg-black" : "border-[#545454] group-hover:border-black"
                                     )}>
                                       {isSelected && (
                                          group.max_select === 1 
                                          ? <div className="w-2.5 h-2.5 rounded-full bg-white" /> 
                                          : <Check size={16} strokeWidth={4} className="text-white" />
                                       )}
                                     </div>
                                   </div>
                                 </div>
                              </div>
                            )
                          })}
                          {/* Final hr to close the list visually */}
                          <div className="px-6 md:pl-3 md:pr-10"><hr className="border-[#e8e8e8] border-t-1 m-0" /></div>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                {/* Special Instructions (Besondere Anweisungen) */}
                <div className="px-6 md:pl-3 md:pr-10 pt-10 pb-6 w-full flex flex-col">
                  <div className="text-[20px] font-bold text-black mb-4">Besondere Anweisungen</div>
                  <div className="w-full border border-[#cfcfcf] rounded-xl bg-white overflow-hidden focus-within:border-black focus-within:ring-1 focus-within:ring-black outline-none transition-all">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Notiz hinzufügen"
                      rows={3}
                      className="w-full p-4 text-[16px] text-black bg-transparent outline-none resize-none placeholder:text-[#545454]"
                    />
                  </div>
                  <div className="text-[14px] text-[#545454] mt-3">Dir werden möglicherweise zusätzliche Kosten berechnet.</div>
                </div>

              </div>
            </div>
          </div>

          {/* ACTION BAR: Pinned to bottom of the entire modal, spans 100% width */}
          <div className="w-full bg-white border-t border-[#e8e8e8] p-4 md:p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 shrink-0">
            <div className="w-full flex gap-3 h-[56px] md:h-[64px]">
              {/* Quantity Select Wrapper */}
              <div className="relative w-[100px] h-full shrink-0">
                <select 
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full h-full bg-[#eeeeee] appearance-none cursor-pointer rounded-xl text-black font-bold text-[18px] flex items-center justify-start pl-6 pr-10 focus:outline-none"
                >
                  {[...Array(20)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="24px" height="24px" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 11.7494V14.916L12 11.0827L7 14.916V11.7494L12 7.91602L17 11.7494Z" fill="currentColor" transform="rotate(180, 12, 12)"></path>
                  </svg>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAddToCart}
                disabled={!isValid}
                className={cn(
                  "flex-1 h-full flex flex-row items-center justify-center text-white text-[16px] md:text-[18px] font-bold rounded-xl transition-all",
                  isValid ? "bg-black hover:opacity-80" : "bg-[#eeeeee] text-[#a6a6a6] cursor-not-allowed"
                )}
              >
                {quantity} zur Bestellung hinzufügen
                <span className="font-normal opacity-90">&nbsp;•&nbsp;</span>
                {formatPrice(totalPrice)}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
      <Modal
        isOpen={isClosedWarningOpen}
        onClose={() => setIsClosedWarningOpen(false)}
        title="Aktuell geschlossen"
        size="sm"
      >
        <div className="p-6 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Wir haben aktuell geschlossen oder nehmen momentan keine Bestellungen an. Bitte versuche es später während unserer Öffnungszeiten.
          </p>
          <Button variant="primary" fullWidth onClick={() => setIsClosedWarningOpen(false)}>
            Verstanden
          </Button>
        </div>
      </Modal>
    </>
  )
}
