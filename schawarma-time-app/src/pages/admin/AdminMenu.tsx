import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Star, Upload, X, Scissors, FolderPlus, LayoutGrid, Utensils, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Product } from '@/types'
import { useMenuStore } from '@/store/menuStore'
import * as productService from '@/services/productService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatPrice } from '@/lib/utils'
import { ImageCropModal } from '@/components/admin/ImageCropModal'
import toast from 'react-hot-toast'

export function AdminMenu() {
  const { categories, products, isLoading, fetchMenu, patchProductLocally, updateProduct,
          createCategory, updateCategory, deleteCategory, reorderCategories } = useMenuStore()
  
  const [view, setView] = useState<'hub' | 'categories' | 'products'>('hub')
  const [activeCategory, setActiveCategory] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState('')

  // Category management state
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', slug: '' })
  const [isCatSubmitting, setIsCatSubmitting] = useState(false)

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // Confirm Modals state
  const [isDeleteCatConfirmOpen, setIsDeleteCatConfirmOpen] = useState(false)
  const [catToDelete, setCatToDelete] = useState<{ id: string, name: string } | null>(null)
  const [isDeleteProductConfirmOpen, setIsDeleteProductConfirmOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchMenu()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories, activeCategory])

  const moveCategoryUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...categories]
    const item = newOrder[index]
    newOrder.splice(index, 1)
    newOrder.splice(index - 1, 0, item)
    reorderCategories(newOrder)
  }

  const moveCategoryDown = (index: number) => {
    if (index === categories.length - 1) return
    const newOrder = [...categories]
    const item = newOrder[index]
    newOrder.splice(index, 1)
    newOrder.splice(index + 1, 0, item)
    reorderCategories(newOrder)
  }

  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '',
    calories: '', is_most_liked: false, is_vegetarian: false, is_vegan: false, is_halal: true,
    image_url: '',
    image_url_modal: '',
    useSizes: false,
    sizes: [] as { id: string, name: string, price: string }[]
  })

  const filteredProducts = products.filter((p) => {
    const matchCategory = p.category_id === activeCategory
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create a local preview URL and open crop modal
    const localUrl = URL.createObjectURL(file)
    setTempImageForCrop(localUrl)
    setIsCropModalOpen(true)
  }

  const handleCropConfirm = (croppedUrl: string, modalUrl?: string) => {
    setForm({ ...form, image_url: croppedUrl, image_url_modal: modalUrl || '' })
    setIsCropModalOpen(false)
    setTempImageForCrop('')
    toast.success('Bilder zugeschnitten ve gespeichert!')
  }

  const openAddModal = () => {
    setEditProduct(null)
    setForm({ 
      name: '', description: '', price: '', category_id: activeCategory, 
      calories: '', is_most_liked: false, is_vegetarian: false, 
      is_vegan: false, is_halal: true, image_url: '', image_url_modal: '',
      useSizes: false,
      sizes: []
    })
    setIsModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditProduct(product)
    setForm({
      name: product.name, description: product.description || '', price: product.price.toString(),
      category_id: product.category_id, calories: product.calories?.toString() || '',
      is_most_liked: product.is_most_liked, is_vegetarian: product.is_vegetarian,
      is_vegan: product.is_vegan, is_halal: product.is_halal,
      // If no image, use sentinel so Kein Bild checkbox is pre-checked
      image_url: product.image_url ?? '__KEIN_BILD__',
      image_url_modal: product.image_url_modal || '',
      useSizes: (product.sizes?.length ?? 0) > 0,
      sizes: (product.sizes ?? []).map(s => ({ ...s, price: s.price.toString() }))
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name) { 
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Name ist erforderlich
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return 
    }
    if (!form.useSizes && !form.price) { 
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Preis ist erforderlich
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return 
    }
    if (form.useSizes && form.sizes.length < 2) { 
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Bitte mindestens 2 Größen hinzufügen
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return 
    }
    
    setIsSubmitting(true)

    try {
      const imageUrl = form.image_url === '__KEIN_BILD__' || !form.image_url ? null : form.image_url

      // If sizes are used, the base price is the price of the first size
      const basePrice = form.useSizes 
        ? parseFloat(form.sizes[0].price)
        : parseFloat(form.price)

      const productData = {
        name: form.name,
        description: form.description || null,
        price: basePrice,
        category_id: form.category_id,
        calories: form.calories ? parseInt(form.calories) : null,
        is_most_liked: form.is_most_liked,
        is_vegetarian: form.is_vegetarian,
        is_vegan: form.is_vegan,
        is_halal: form.is_halal,
        image_url: imageUrl,
        image_url_modal: form.image_url_modal || null,
        sizes: form.useSizes ? form.sizes.map(s => ({
          id: s.id || crypto.randomUUID(),
          name: s.name,
          price: parseFloat(s.price)
        })) : []
      }

      if (editProduct) {
        const updatedProduct = await productService.updateProduct(editProduct.id, productData)
        patchProductLocally(editProduct.id, updatedProduct)
        toast.success('Produkt aktualisiert!')
      } else {
        await productService.createProduct({ ...productData, is_active: true, position: products.length + 1 })
        toast.success('Produkt hinzugefügt!')
        fetchMenu() // Only fetch for new products to get the generated ID
      }

      setIsModalOpen(false)
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Fehler beim Speichern: {err.message}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleActive = async (productId: string, current: boolean) => {
    await updateProduct(productId, { is_active: !current })
  }

  const toggleMostLiked = async (productId: string, current: boolean) => {
    await updateProduct(productId, { is_most_liked: !current })
  }

  // ── Category handlers ────────────────────────────────────────────────────────
  const openAddCategory = () => {
    setEditCategoryId(null)
    setCatForm({ name: '', slug: '' })
    setIsCatModalOpen(true)
  }

  const openEditCategory = (id: string, name: string, slug: string) => {
    setEditCategoryId(id)
    setCatForm({ name, slug })
    setIsCatModalOpen(true)
  }

  const handleSaveCategory = async () => {
    const name = catForm.name.trim()
    const slug = catForm.slug.trim() || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!name) { 
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Kategoriename ist erforderlich
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return 
    }
    setIsCatSubmitting(true)
    try {
      if (editCategoryId) {
        await updateCategory(editCategoryId, { name, slug })
        toast.success('Kategorie aktualisiert!')
      } else {
        await createCategory(name, slug)
        toast.success('Kategorie hinzugefügt!')
      }
      setIsCatModalOpen(false)
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Fehler: {err.message}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsCatSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const count = products.filter(p => p.category_id === id).length
    if (count > 0) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Kategorie "{name}" hat noch {count} Produkt(e). Bitte zuerst verschieben oder löschen.
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return
    }
    setCatToDelete({ id, name })
    setIsDeleteCatConfirmOpen(true)
  }

  const performDeleteCategory = async () => {
    if (!catToDelete) return
    try {
      await deleteCategory(catToDelete.id)
      if (activeCategory === catToDelete.id) setActiveCategory(categories[0]?.id ?? '')
      toast.success('Kategorie gelöscht')
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Fehler: {err.message}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsDeleteCatConfirmOpen(false)
      setCatToDelete(null)
    }
  }

  const deleteProduct = (productId: string) => {
    setProductToDelete(productId)
    setIsDeleteProductConfirmOpen(true)
  }

  const performDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await productService.deleteProduct(productToDelete)
      toast.success('Produkt gelöscht')
      fetchMenu()
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Fehler beim Löschen: {err.message}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsDeleteProductConfirmOpen(false)
      setProductToDelete(null)
    }
  }


  const renderHub = () => (
    <div className="flex flex-col gap-6 p-2 py-6 h-full justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-[#142328] uppercase tracking-tighter italic">Menü-Manager</h1>
        <p className="text-gray-500 font-bold">Wählen Sie einen Bereich</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <button
          onClick={() => setView('categories')}
          className="flex items-center gap-6 p-8 bg-white rounded-[2.5rem] border-4 border-gray-50 shadow-xl shadow-gray-200/50 active:scale-95 transition-all text-left"
        >
          <div className="w-20 h-20 bg-emerald-50 text-[#06c167] rounded-3xl flex items-center justify-center shadow-inner shrink-0">
            <LayoutGrid size={40} />
          </div>
          <div>
            <span className="block text-2xl font-black text-[#142328]">Kategorien</span>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Reihenfolge & Namen</span>
          </div>
        </button>

        <button
          onClick={() => setView('products')}
          className="flex items-center gap-6 p-8 bg-white rounded-[2.5rem] border-4 border-gray-50 shadow-xl shadow-gray-200/50 active:scale-95 transition-all text-left"
        >
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner shrink-0">
            <Utensils size={40} />
          </div>
          <div>
            <span className="block text-2xl font-black text-[#142328]">Artikel</span>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Produkte bearbeiten</span>
          </div>
        </button>
      </div>
    </div>
  )

  const renderCategories = () => (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4 sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md py-3 -mx-4 px-4 border-b border-gray-100">
        <button onClick={() => setView('hub')} className="p-2 -ml-2 text-[#142328]">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-900 flex-1">Kategorien</h1>
        <Button variant="primary" onClick={openAddCategory} className="h-10 px-4 rounded-xl">
          <Plus size={18} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">
        <div className="space-y-3">
          {categories.map((cat, index) => (
            <CategoryItem 
              key={cat.id} 
              cat={cat} 
              index={index}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              onMoveUp={() => moveCategoryUp(index)}
              onMoveDown={() => moveCategoryDown(index)}
              onEdit={() => openEditCategory(cat.id, cat.name, cat.slug)}
              onDelete={() => handleDeleteCategory(cat.id, cat.name)}
            />
          ))}
        </div>
      </div>
    </div>
  )

  const renderProducts = () => (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-4 sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md py-3 -mx-4 px-4 border-b border-gray-100">
        <button onClick={() => setView('hub')} className="p-2 -ml-2 text-[#142328]">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-900 flex-1 truncate">Artikel</h1>
        <Button variant="primary" onClick={openAddModal} className="h-10 px-4 rounded-xl shadow-lg shadow-[#142328]/10 flex-shrink-0">
          <Plus size={18} />
        </Button>
      </div>

      <div className="sticky top-[61px] z-20 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 pb-3 space-y-3">
        <div className="relative">
          <Input
            placeholder="Produkt suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl text-base"
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  isActive 
                    ? 'bg-[#142328] text-white ring-2 ring-[#142328]/10' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-1">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Lädt...</div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex items-center gap-3 ${!product.is_active ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-50">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-50">🍔</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-[#142328] truncate leading-tight">{product.name}</p>
                    <p className="text-sm font-black text-[#142328] mt-0.5">{formatPrice(product.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(product)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#142328] rounded-xl transition-colors"><Edit2 size={18} /></button>
                    <Toggle checked={product.is_active} onChange={() => toggleActive(product.id, product.is_active)} size="sm" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full">
      {view === 'hub' && renderHub()}
      {view === 'categories' && renderCategories()}
      {view === 'products' && renderProducts()}

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editProduct ? 'Artikel bearbeiten' : 'Neuer Artikel'}>
        <div className="p-5 space-y-4">
          <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <Input label="Preis" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
            <Button variant="primary" fullWidth onClick={handleSave} isLoading={isSubmitting}>Speichern</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={editCategoryId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}>
        <div className="p-5 space-y-4">
          <Input label="Name" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setIsCatModalOpen(false)}>Abbrechen</Button>
            <Button variant="primary" fullWidth onClick={handleSaveCategory} isLoading={isCatSubmitting}>Speichern</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={isDeleteCatConfirmOpen} onClose={() => setIsDeleteCatConfirmOpen(false)} onConfirm={performDeleteCategory} title="Kategorie löschen?" message="Bist du sicher?" />
      <ConfirmModal isOpen={isDeleteProductConfirmOpen} onClose={() => setIsDeleteProductConfirmOpen(false)} onConfirm={performDeleteProduct} title="Produkt löschen?" message="Bist du sicher?" />
    </div>
  )
}

function CategoryItem({ cat, index, isFirst, isLast, onMoveUp, onMoveDown, onEdit, onDelete }: { 
  cat: any, 
  index: number,
  isFirst: boolean,
  isLast: boolean,
  onMoveUp: () => void,
  onMoveDown: () => void,
  onEdit: () => void, 
  onDelete: () => void 
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-50 shadow-sm p-4 flex items-center gap-4">
      {/* Move Buttons */}
      <div className="flex flex-col gap-1">
        <button 
          onClick={onMoveUp}
          disabled={isFirst}
          className={`p-1.5 rounded-lg transition-colors ${isFirst ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:bg-gray-50 active:bg-gray-100'}`}
        >
          <ChevronUp size={20} />
        </button>
        <button 
          onClick={onMoveDown}
          disabled={isLast}
          className={`p-1.5 rounded-lg transition-colors ${isLast ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:bg-gray-50 active:bg-gray-100'}`}
        >
          <ChevronDown size={20} />
        </button>
      </div>

      <div className="flex-1 font-black text-[#142328] text-lg uppercase tracking-tighter italic">{cat.name}</div>
      
      <div className="flex items-center gap-1">
        <button onClick={onEdit} className="p-2 text-gray-400 hover:text-[#142328] rounded-xl"><Edit2 size={18} /></button>
        <button onClick={onDelete} className="p-2 text-red-400 hover:text-red-600 rounded-xl"><Trash2 size={18} /></button>
      </div>
    </div>
  )
}
