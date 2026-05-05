import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Star, Upload, X, Scissors, FolderPlus } from 'lucide-react'
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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newOrder = [...categories]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(index, 0, removed)

    reorderCategories(newOrder)
    setDraggedIndex(null)
    setDragOverIndex(null)
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">Menü verwalten</h1>
        <Button variant="primary" onClick={openAddModal}>
          <Plus size={16} />
          Produkt hinzufügen
        </Button>
      </div>

      <div className="flex gap-4">
        {/* Category Sidebar */}
        <div className="w-52 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-1">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-gray-100 mb-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Kategorien</span>
              <button
                onClick={openAddCategory}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#142328] transition-colors"
                title="Kategorie hinzufügen"
              >
                <FolderPlus size={15} />
              </button>
            </div>

            {categories.map((cat, index) => {
              const count = products.filter((p) => p.category_id === cat.id).length
              const isActive = activeCategory === cat.id
              const isDragging = draggedIndex === index
              const isOver = dragOverIndex === index && !isDragging

              return (
                <div 
                  key={cat.id} 
                  className={`group relative transition-all ${isOver ? 'pt-8' : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null) }}
                  onDrop={() => handleDrop(index)}
                >
                  {/* Drop Indicator */}
                  {isOver && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#06c167] rounded-full animate-pulse" />
                  )}

                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive ? 'bg-[#142328] text-white' : 'text-gray-600 hover:bg-gray-50'
                    } ${isDragging ? 'opacity-30 scale-95' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical size={14} className={`shrink-0 ${isActive ? 'text-white/40' : 'text-gray-300'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <span className="truncate pr-1">{cat.name}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                      {count}
                    </span>
                  </button>

                  {/* Edit / Delete icons — visible on hover */}
                  <div className={`absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 ${isActive ? 'hidden' : ''}`}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditCategory(cat.id, cat.name, cat.slug) }}
                      className="p-1 rounded bg-white shadow-sm text-gray-400 hover:text-[#142328]"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name) }}
                      className="p-1 rounded bg-white shadow-sm text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Products */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Produkt suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

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
                    className={`bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4 ${!product.is_active ? 'opacity-60' : ''}`}
                  >
                    {/* Drag handle */}
                    <div className="text-gray-300 cursor-grab shrink-0">
                      <GripVertical size={18} />
                    </div>

                    {/* Image */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🍔</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{product.name}</p>
                        {product.is_most_liked && <Badge variant="mostLiked">⭐ Beliebt</Badge>}
                        {product.is_vegetarian && <Badge variant="vegetarian">Vegy</Badge>}
                        {product.is_vegan && <Badge variant="vegan">Vegan</Badge>}
                        {product.is_halal && <Badge variant="halal">Halal</Badge>}
                      </div>
                      {product.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{product.description}</p>
                      )}
                      <p className="text-sm font-black text-[#142328] mt-1">{formatPrice(product.price)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active toggle */}
                      <Toggle
                        checked={product.is_active}
                        onChange={() => toggleActive(product.id, product.is_active)}
                        size="sm"
                      />

                      {/* Star (most liked) */}
                      <button
                        onClick={() => toggleMostLiked(product.id, product.is_most_liked)}
                        className={`p-1.5 rounded-lg transition-colors ${product.is_most_liked ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'}`}
                      >
                        <Star size={16} fill={product.is_most_liked ? 'currentColor' : 'none'} />
                      </button>

                      {/* Crop existing image */}
                      {product.image_url && (
                        <button
                          onClick={() => {
                            setTempImageForCrop(product.image_url!)
                            setIsCropModalOpen(true)
                            // Pre-fill form so crop result is saved to the right product
                            openEditModal(product)
                          }}
                          className="p-1.5 text-gray-300 hover:text-[#142328] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Bild zuschneiden"
                        >
                          <Scissors size={16} />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1.5 text-gray-400 hover:text-[#142328] hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {!isLoading && filteredProducts.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🍔</p>
                <p>Keine Produkte in dieser Kategorie</p>
                <Button variant="primary" className="mt-4" onClick={openAddModal}>
                  <Plus size={16} />
                  Produkt hinzufügen
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
        size="lg"
      >
        <div className="p-5 space-y-4">
          {/* Image upload section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Produktbild</label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.image_url === '__KEIN_BILD__'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setForm({ ...form, image_url: '__KEIN_BILD__' })
                    } else {
                      setForm({ ...form, image_url: '' })
                    }
                  }}
                  className="w-4 h-4 accent-[#142328] rounded"
                />
                <span className="text-sm text-gray-500">Kein Bild (Text-only Karte)</span>
              </label>
            </div>

            {form.image_url !== '__KEIN_BILD__' ? (
              <>
                <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#142328] transition-colors cursor-pointer block relative">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={false}
                  />
                  {form.image_url ? (
                    <div className="relative">
                      <img src={form.image_url} alt="Preview" className="h-32 mx-auto rounded-lg object-cover" />
                      <div className="absolute top-1 right-1 flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            setTempImageForCrop(form.image_url)
                            setIsCropModalOpen(true)
                          }}
                          className="bg-white rounded-full px-2 py-0.5 shadow text-xs font-bold text-[#142328] hover:bg-gray-50 transition-colors flex items-center gap-1"
                        >
                          ✂️ Zuschneiden
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setForm({ ...form, image_url: '' }) }}
                          className="bg-white rounded-full p-0.5 shadow hover:bg-gray-50 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Bild hochladen oder URL eingeben</p>
                    </div>
                  )}
                </label>
                <Input
                  placeholder="Bild-URL (optional, nur https://res.cloudinary.com/...)"
                  value={form.image_url}
                  onChange={(e) => {
                    const url = e.target.value.trim()
                    // Only allow empty or valid Cloudinary HTTPS URLs
                    if (url === '' || url.startsWith('https://res.cloudinary.com/')) {
                      setForm({ ...form, image_url: url })
                    }
                  }}
                  className="mt-2"
                />
              </>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50">
                <p className="text-sm text-gray-400">Die Produktkarte wird ohne Bild angezeigt (volle Breite, nur Text).</p>
              </div>
            )}
          </div>


          <Input label="Produktname" placeholder="z.B. Smash Burger" required
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Zutaten und Beschreibung..."
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#142328]"
            />
          </div>

          {/* Größen-Optionen Toggle */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
            <Toggle 
              checked={form.useSizes} 
              onChange={(v) => {
                // Initialize with 2 sizes if activating and list is empty
                const sizes = v && form.sizes.length === 0 
                  ? [{ id: crypto.randomUUID(), name: 'Normal', price: form.price || '' }, { id: crypto.randomUUID(), name: 'Groß', price: '' }] 
                  : form.sizes
                setForm({ ...form, useSizes: v, sizes })
              }} 
              label="Größen-Optionen aktivieren" 
            />
            
            <AnimatePresence>
              {form.useSizes && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3 pt-2"
                >
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Größen & Preise</p>
                  {form.sizes.map((size, idx) => (
                    <div key={size.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input 
                          placeholder="Name (z.B. Normal)" 
                          value={size.name} 
                          onChange={(e) => {
                            const newSizes = [...form.sizes]
                            newSizes[idx].name = e.target.value
                            setForm({ ...form, sizes: newSizes })
                          }} 
                        />
                      </div>
                      <div className="w-24">
                        <Input 
                          type="number" 
                          placeholder="7.50" 
                          value={size.price} 
                          onChange={(e) => {
                            const newSizes = [...form.sizes]
                            newSizes[idx].price = e.target.value
                            setForm({ ...form, sizes: newSizes })
                          }} 
                        />
                      </div>
                      {form.sizes.length > 2 && (
                        <button 
                          onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, i) => i !== idx) })}
                          className="mb-2.5 p-1 text-gray-400 hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {form.sizes.length < 4 && (
                    <button 
                      onClick={() => setForm({ 
                        ...form, 
                        sizes: [...form.sizes, { id: crypto.randomUUID(), name: '', price: '' }] 
                      })}
                      className="text-xs font-bold text-[#142328] hover:opacity-75 flex items-center gap-1 mt-1"
                    >
                      <Plus size={12} /> Größe hinzufügen
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!form.useSizes && (
              <Input label="Preis (€)" type="number" step="0.50" placeholder="7.50" required
                value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            )}
            <Input label="Kalorien (kcal)" type="number" placeholder="650"
              value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategorie</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#142328]"
            >
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Toggle checked={form.is_most_liked} onChange={(v) => setForm({ ...form, is_most_liked: v })} label="Beliebt ⭐" />
            <Toggle checked={form.is_halal} onChange={(v) => setForm({ ...form, is_halal: v })} label="Halal 🌿" />
            <Toggle checked={form.is_vegetarian} onChange={(v) => setForm({ ...form, is_vegetarian: v })} label="Vegetarisch 🥗" />
            <Toggle checked={form.is_vegan} onChange={(v) => setForm({ ...form, is_vegan: v })} label="Vegan 🌱" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
            <Button variant="primary" fullWidth onClick={handleSave} isLoading={isSubmitting}>
              {editProduct ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editCategoryId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <Input
            label="Name"
            placeholder="z.B. Burger"
            value={catForm.name}
            onChange={(e) => {
              const name = e.target.value
              const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              setCatForm({ name, slug })
            }}
          />
          <Input
            label="Slug (URL-Kürzel)"
            placeholder="z.B. burger"
            value={catForm.slug}
            onChange={(e) => setCatForm({ ...catForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
          />
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" fullWidth onClick={() => setIsCatModalOpen(false)}>Abbrechen</Button>
            <Button variant="primary" fullWidth onClick={handleSaveCategory} isLoading={isCatSubmitting}>
              {editCategoryId ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageUrl={tempImageForCrop}
        onClose={() => { setIsCropModalOpen(false); setTempImageForCrop('') }}
        onConfirm={handleCropConfirm}
        productInfo={form.name ? {
          name: form.name,
          price: parseFloat(form.price) || 0,
          description: form.description,
        } : undefined}
      />

      <ConfirmModal
        isOpen={isDeleteCatConfirmOpen}
        onClose={() => { setIsDeleteCatConfirmOpen(false); setCatToDelete(null) }}
        onConfirm={performDeleteCategory}
        title="Kategorie löschen?"
        message={`Möchtest du die Kategorie "${catToDelete?.name}" wirklich löschen?`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={isDeleteProductConfirmOpen}
        onClose={() => { setIsDeleteProductConfirmOpen(false); setProductToDelete(null) }}
        onConfirm={performDeleteProduct}
        title="Produkt löschen?"
        message="Möchtest du bu Produkt wirklich unwiderruflich löschen?"
        confirmText="Löschen"
        cancelText="Abbrechen"
        isDangerous={true}
      />
    </div>
  )
}
