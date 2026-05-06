import { useState, useRef, useEffect } from 'react'
import type { Product } from '@/types'
import { HeroSection } from '@/components/menu/HeroSection'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { RecommendedItems } from '@/components/menu/RecommendedItems'
import { ProductCard } from '@/components/menu/ProductCard'
import { ProductModal } from '@/components/menu/ProductModal'
import { MapSection } from '@/components/menu/MapSection'
import { useRestaurantStore } from '@/store/restaurantStore'
import { useMenuStore } from '@/store/menuStore'

function SkeletonCard() {
  return (
    <div className="flex flex-row items-stretch bg-white rounded-xl border border-[#e8e8e8] overflow-hidden h-[120px] md:h-[140px] w-full">
      <div className="flex-1 flex flex-col min-w-0 p-4 justify-center gap-2">
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="relative shrink-0 bg-gray-100 h-full animate-pulse" style={{ aspectRatio: '1.25' }} />
    </div>
  )
}

function SkeletonSection() {
  return (
    <div className="space-y-10">
      <div className="h-40 w-full bg-gray-200 animate-pulse" />
      <div className="px-4">
        {[1, 2].map((section) => (
          <div key={section} className="mb-10">
            <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomePage() {
  const [activeCategory, setActiveCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const sectionRefs = useRef<Record<string, HTMLElement>>({})
  
  const { settings, isLoading: settingsLoading, error: settingsError } = useRestaurantStore()
  const { categories, products, fetchMenu, isLoading, error: menuError } = useMenuStore()

  useEffect(() => {
    fetchMenu()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Set initial active category
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]?.slug || '')
    }
  }, [categories, activeCategory])

  const activeCategories = categories.filter((cat) =>
    products.some((p) => p.category_id === cat.id && cat.is_active)
  )

  const filteredProducts = searchQuery
    ? products.filter(
        (p) =>
          p.is_active &&
          (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : products.filter((p) => p.is_active)

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug)
    setSearchQuery('')
    const el = sectionRefs.current[slug]
    if (el) {
      // Offset should account for Header (72-80px) + CategoryNav (~140px)
      const offset = 220
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (searchQuery) return
      // Use the same offset for active category detection
      const offset = 240
      for (const cat of [...activeCategories].reverse()) {
        const el = sectionRefs.current[cat.slug]
        if (el && el.getBoundingClientRect().top <= offset) {
          setActiveCategory(cat.slug)
          break
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [activeCategories, searchQuery])

  if (settingsLoading && !settings) {
    return <SkeletonSection />
  }

  if (settingsError || menuError) {
    return (
      <div className="min-h-screen bg-white px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-red-100 bg-red-50 px-6 py-8 text-center">
          <h1 className="text-2xl font-black text-red-900">Menü konnte nicht geladen werden</h1>
          <p className="mt-3 text-sm text-red-700">
            {settingsError || menuError}
          </p>
          <p className="mt-2 text-sm text-red-600">
            Bitte lade die Seite neu oder prüfe die Verbindung zur Datenbank.
          </p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-white px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-gray-200 bg-gray-50 px-6 py-8 text-center">
          <h1 className="text-2xl font-black text-gray-900">Restaurantdaten fehlen</h1>
          <p className="mt-3 text-sm text-gray-600">
            Die Grundeinstellungen konnten nicht geladen werden. Bitte prüfe, ob in Supabase ein Datensatz für
            `restaurant_settings` vorhanden ist.
          </p>
        </div>
      </div>
    )
  }

  if (!isLoading && !menuError && activeCategories.length === 0 && filteredProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-white border-b border-gray-100">
          <HeroSection settings={settings} />
          {settings.is_map_mode_active && <MapSection settings={settings} />}
        </div>

        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-8">
            <h2 className="text-2xl font-black text-amber-950">Menü ist noch leer</h2>
            <p className="mt-3 text-sm text-amber-800">
              Firebase ist erreichbar, aber in `categories` oder `products` sind noch keine sichtbaren Einträge vorhanden.
            </p>
            <p className="mt-2 text-sm text-amber-700">
              Lege zuerst Kategorien und Produkte an oder importiere die bestehenden Daten.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-100">
        <HeroSection settings={settings} />
        {settings.is_map_mode_active && <MapSection settings={settings} />}
      </div>

      <div className="bg-white">
        {!searchQuery && (
          <RecommendedItems products={products} onProductClick={setSelectedProduct} />
        )}
      </div>

      <CategoryNav
        categories={activeCategories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <SkeletonSection />
        ) : searchQuery ? (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {filteredProducts.length} Ergebnisse für „{searchQuery}"
            </p>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-gray-500">Keine Produkte gefunden.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onClick={setSelectedProduct} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {activeCategories.map((category) => {
              const categoryProducts = filteredProducts.filter((p) => p.category_id === category.id)
              if (categoryProducts.length === 0) return null

              return (
                <section
                  key={category.id}
                  ref={(el) => { if (el) sectionRefs.current[category.slug] = el }}
                  id={`category-${category.slug}`}
                  style={{ scrollMarginTop: '220px' }}
                >
                  <h2 className="text-[26px] font-bold text-black mb-4">
                    {category.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryProducts.map((product) => (
                      <ProductCard key={product.id} product={product} onClick={setSelectedProduct} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  )
}
