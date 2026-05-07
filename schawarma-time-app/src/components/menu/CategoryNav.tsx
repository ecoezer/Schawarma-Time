import { useEffect, useRef, useState } from 'react'
import { Search, X, List } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Category, RestaurantSettings } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryNavProps {
  categories: Category[]
  activeCategory: string
  onCategoryClick: (slug: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  settings: RestaurantSettings
}

export function CategoryNav({ categories, activeCategory, onCategoryClick, searchQuery, onSearchChange, settings }: CategoryNavProps) {
  const [isStuck, setIsStuck] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownTop, setDropdownTop] = useState(0)
  const [dropdownLeft, setDropdownLeft] = useState(0)
  const navRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const todayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
  const todayHours = settings.hours?.[todayKey]
  const openingText = !todayHours || todayHours.is_closed
    ? 'Heute geschlossen'
    : `${todayHours.open} – ${todayHours.close}`

  // Detect sticky
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 1, rootMargin: '-1px 0px 0px 0px' }
    )
    if (navRef.current) observer.observe(navRef.current)
    return () => observer.disconnect()
  }, [])

  // Scroll active tab into view
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const activeBtn = container.querySelector('[data-active="true"]') as HTMLButtonElement
    if (activeBtn) {
      const containerRect = container.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()
      const scrollLeft = container.scrollLeft + (btnRect.left - containerRect.left) - containerRect.width / 2 + btnRect.width / 2
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
    }
  }, [activeCategory])

  const openMenu = () => {
    if (navRef.current) {
      const rect = navRef.current.getBoundingClientRect()
      setDropdownTop(rect.bottom)
    }
    if (scrollContainerRef.current) {
      const tabsRect = scrollContainerRef.current.getBoundingClientRect()
      setDropdownLeft(tabsRect.left)
    }
    setMenuOpen(true)
  }

  const handleCategorySelect = (slug: string) => {
    onCategoryClick(slug)
    setMenuOpen(false)
  }

  return (
    <>
      {/* ─── Sticky Navbar ─── */}
      <div
        ref={navRef}
        className={cn(
          'sticky top-[72px] lg:top-[80px] z-30 bg-white transition-shadow duration-150 pt-4 pb-0',
          isStuck && 'shadow-sm'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Info & Search Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-[17px] font-bold text-[#142328]">Öffnungszeiten</h3>
              <p className="text-[14px] text-[#545454] mt-0.5">{openingText}</p>
            </div>

            {/* Search */}
            <div className="relative shrink-0 w-full sm:w-[360px]">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#142328]" strokeWidth={2.5} />
              <input
                type="text"
                placeholder={`Suche in ${settings.name}`}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-[46px] pr-10 py-3 text-[15px] font-medium bg-[#f6f6f6] border-transparent rounded-full focus:outline-none focus:bg-[#e2e2e2] transition-colors placeholder:text-[#545454]"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Tab Row */}
          <div className="flex items-center gap-2 py-0 border-b border-[#e0e0e0] mt-2">
            {/* Hamburger / List icon */}
            <button
              onClick={openMenu}
              className="text-[#142328] hover:bg-[#f6f6f6] rounded-full transition-colors shrink-0 flex items-center justify-center p-2.5 mb-1.5 ml-0"
              aria-label="Vollständiges Menü öffnen"
            >
              <List size={22} strokeWidth={2.5} />
            </button>

            {/* Category Tabs */}
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-0 overflow-x-auto scrollbar-none flex-1 mt-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat.slug
                return (
                  <button
                    key={cat.id}
                    data-active={isActive}
                    onClick={() => onCategoryClick(cat.slug)}
                    className={cn(
                      'relative shrink-0 px-4 py-3.5 text-[15px] font-bold transition-all whitespace-nowrap',
                      isActive
                        ? 'text-[#142328]'
                        : 'text-[#6b6b6b] hover:bg-[#f6f6f6] rounded-md'
                    )}
                  >
                    {cat.name}
                    {isActive && (
                      <span className="absolute bottom-[-1px] left-0 right-0 h-[5px] bg-black rounded-sm" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Vollständiges Menü ─── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop — invisible but catches outside clicks */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />

            {/* Floating card panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.7 }}
              className="fixed z-50 bg-white rounded-xl overflow-hidden"
              style={{
                top: dropdownTop + 2,
                left: dropdownLeft,
                width: 272,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="text-[19px] font-bold text-black leading-tight">Vollständiges Menü</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 bg-[#f0f0f0] rounded-full flex items-center justify-center hover:bg-[#e2e2e2] transition-colors shrink-0 ml-2"
                >
                  <X size={15} strokeWidth={2.5} className="text-black" />
                </button>
              </div>

              {/* Category rows */}
              <div className="overflow-y-auto pb-2">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.slug
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.slug)}
                      className={cn(
                        'w-full text-left px-4 py-3 text-[15px] transition-colors',
                        isActive
                          ? 'bg-[#f5f5f5] text-black font-semibold'
                          : 'text-[#5a5a5a] hover:bg-[#f9f9f9] font-normal'
                      )}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
