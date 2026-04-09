import { useState, useRef, useEffect } from 'react'
import type { Product, Category } from '@/types'
import { mockCategories, mockProducts, mockRestaurantSettings } from '@/data/mockData'
import { HeroSection } from '@/components/menu/HeroSection'
import { CategoryNav } from '@/components/menu/CategoryNav'
import { RecommendedItems } from '@/components/menu/RecommendedItems'
import { ProductCard } from '@/components/menu/ProductCard'
import { ProductModal } from '@/components/menu/ProductModal'
import { MapSection } from '@/components/menu/MapSection'
import { useRestaurantStore } from '@/store/restaurantStore'
import { supabase } from '@/lib/supabase'

export function HomePage() {
  const [activeCategory, setActiveCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>(mockCategories)
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const sectionRefs = useRef<Record<string, HTMLElement>>({})
  const { settings } = useRestaurantStore()

  // Fetch categories and products from Supabase
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data: cats, error: catErr } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('position')

        if (!catErr && cats && cats.length > 0) {
          setCategories(cats as Category[])
        }

        const { data: prods, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .order('position')

        if (!prodErr && prods && prods.length > 0) {
          setProducts(prods as Product[])
        }
      } catch {
        // Supabase bağlantısı yoksa mock data kullan
        console.info('Mock data kullanılıyor')
      }
    }

    fetchMenu()
  }, [])

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

  const displaySettings = settings || mockRestaurantSettings

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-100">
        <HeroSection settings={displaySettings} />
        <MapSection settings={displaySettings} />
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
        {searchQuery ? (
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
