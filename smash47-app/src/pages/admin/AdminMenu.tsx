import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Star, Upload, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Product } from '@/types'
import { useMenuStore } from '@/store/menuStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils'
import toast from 'react-hot-toast'

export function AdminMenu() {
  const { categories, products, isLoading, fetchMenu, updateProduct } = useMenuStore()
  const [activeCategory, setActiveCategory] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories, activeCategory])

  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '',
    calories: '', is_most_liked: false, is_vegetarian: false, is_vegan: false, is_halal: true,
    image_url: '',
  })

  const filteredProducts = products.filter((p) => {
    const matchCategory = p.category_id === activeCategory
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      toast.error('Cloudinary konfigürasyonu eksik (.env kontrol edin)')
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Resim yüklenemedi')

      const data = await response.json()
      const urlParts = data.secure_url.split('/upload/')
      if (urlParts.length === 2) {
        const optimizedUrl = `${urlParts[0]}/upload/f_auto,q_auto,w_800,h_800,c_fill/${urlParts[1]}`
        setForm({ ...form, image_url: optimizedUrl })
      } else {
        setForm({ ...form, image_url: data.secure_url })
      }
      toast.success('Resim başarıyla yüklendi!')
    } catch (error: any) {
      toast.error(error.message || 'Resim yükleme hatası')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const openAddModal = () => {
    setEditProduct(null)
    setForm({ 
      name: '', description: '', price: '', category_id: activeCategory, 
      calories: '', is_most_liked: false, is_vegetarian: false, 
      is_vegan: false, is_halal: true, image_url: '' 
    })
    setIsModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditProduct(product)
    setForm({
      name: product.name, description: product.description || '', price: product.price.toString(),
      category_id: product.category_id, calories: product.calories?.toString() || '',
      is_most_liked: product.is_most_liked, is_vegetarian: product.is_vegetarian,
      is_vegan: product.is_vegan, is_halal: product.is_halal, image_url: product.image_url || '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name und Preis sind erforderlich'); return }
    setIsSubmitting(true)

    try {
      const productData = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        category_id: form.category_id,
        calories: form.calories ? parseInt(form.calories) : null,
        is_most_liked: form.is_most_liked,
        is_vegetarian: form.is_vegetarian,
        is_vegan: form.is_vegan,
        is_halal: form.is_halal,
        image_url: form.image_url || null,
      }

      if (editProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editProduct.id)
        if (error) throw error
        toast.success('Produkt aktualisiert!')
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{ ...productData, is_active: true, position: products.length + 1 }])
        if (error) throw error
        toast.success('Produkt hinzugefügt!')
      }
      
      await fetchMenu() // Refresh list
      setIsModalOpen(false)
    } catch (err: any) {
      toast.error('Fehler beim Speichern: ' + err.message)
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

  const deleteProduct = async (productId: string) => {
    if (confirm('Produkt wirklich löschen?')) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', productId)
        if (error) throw error
        toast.success('Produkt gelöscht')
        fetchMenu()
      } catch (err: any) {
        toast.error('Fehler beim Löschen: ' + err.message)
      }
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
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-1">
            {categories.map((cat) => {
              const count = products.filter((p) => p.category_id === cat.id).length
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeCategory === cat.id ? 'bg-[#142328] text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                </button>
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
          {/* Image upload placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Produktbild</label>
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#142328] transition-colors cursor-pointer block relative">
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={isUploadingImage}
              />
              {isUploadingImage ? (
                <div className="py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#142328] mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Wird hochgeladen...</p>
                </div>
              ) : form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="Preview" className="h-32 mx-auto rounded-lg object-cover" />
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setForm({ ...form, image_url: '' }) }} 
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Bild hochladen oder URL eingeben</p>
                </div>
              )}
            </label>
            <Input
              placeholder="Bild-URL (optional)"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="mt-2"
            />
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

          <div className="grid grid-cols-2 gap-4">
            <Input label="Preis (€)" type="number" step="0.50" placeholder="7.50" required
              value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
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
    </div>
  )
}
