import { useState, useEffect, useRef } from 'react'
import { Clock, Truck, Euro, Bell, Save, RefreshCw, Store, X, Plus, ImageIcon, Upload, Map as MapIcon } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useRestaurantStore } from '@/store/restaurantStore'
import type { RestaurantSettings } from '@/types'
import toast from 'react-hot-toast'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const DAYS = [
  { key: 'monday', label: 'Montag' },
  { key: 'tuesday', label: 'Dienstag' },
  { key: 'wednesday', label: 'Mittwoch' },
  { key: 'thursday', label: 'Donnerstag' },
  { key: 'friday', label: 'Freitag' },
  { key: 'saturday', label: 'Samstag' },
  { key: 'sunday', label: 'Sonntag' },
]

export function AdminSettings() {
  const { settings, updateSettings } = useRestaurantStore()
  const [localSettings, setLocalSettings] = useState(settings)
  const [hours, setHours] = useState(settings?.hours || {})
  const [isSaving, setIsSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [isUploadingHero, setIsUploadingHero] = useState(false)
  const [isSavingHero, setIsSavingHero] = useState(false)
  const [pendingHeroUrl, setPendingHeroUrl] = useState<string | null>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
      setHours(settings.hours)
    }
  }, [settings])

  const update = <K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) => {
    setLocalSettings((prev) => prev ? ({ ...prev, [key]: value }) : prev)
  }

  const updateHours = (day: string, field: 'open' | 'close' | 'is_closed', value: string | boolean) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  const handleSave = async () => {
    if (!localSettings) return
    setIsSaving(true)
    try {
      await updateSettings({ ...localSettings, hours })
      toast.success('Einstellungen gespeichert!')
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Fehler beim Speichern: {err.message}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsSaving(false)
    }
  }



  if (!localSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
        <RefreshCw size={32} className="animate-spin" />
        <p>Einstellungen werden geladen...</p>
      </div>
    )
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag || localSettings?.tags?.includes(tag)) return
    update('tags', [...(localSettings?.tags || []), tag])
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    update('tags', (localSettings?.tags || []).filter(t => t !== tag))
  }

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { 
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Nur Bilddateien erlaubt
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
      return 
    }
    setIsUploadingHero(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST', body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || 'Upload fehlgeschlagen')
      // Optimized URL: auto format + quality, max 1600px wide
      const parts = data.secure_url.split('/upload/')
      const finalUrl = parts.length === 2
        ? `${parts[0]}/upload/f_auto,q_auto,w_1600/${parts[1]}`
        : data.secure_url
      setPendingHeroUrl(finalUrl)
      update('hero_images', [finalUrl])
      toast.success('Bild bereit – jetzt speichern!')
    } catch (err: any) {
      toast.error((t) => (
        <span className="flex items-center gap-2">
          Upload fehlgeschlagen: {err.message}
          <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
        </span>
      ), { duration: Infinity })
    } finally {
      setIsUploadingHero(false)
      if (heroInputRef.current) heroInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24 relative">
      <div className="flex items-center justify-between sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md py-3 -mx-4 px-4 border-b border-gray-100">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">Einstellungen</h1>
        <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSave} className="shadow-lg shadow-[#142328]/10">
          <Save size={16} />
          <span className="hidden sm:inline ml-1">Speichern</span>
        </Button>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Store size={18} className="text-[#142328]" />
          Restaurant-Informationen
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Restaurant-Name"
              value={localSettings.name}
              onChange={(e) => update('name', e.target.value)}
            />
            <Input
              label="Adresse"
              value={localSettings.address}
              onChange={(e) => update('address', e.target.value)}
            />
            <Input
              label="Telefon"
              value={localSettings.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
            <Input
              label="E-Mail"
              type="email"
              value={localSettings.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-gray-50">
            <Toggle
              checked={localSettings.is_search_active}
              onChange={(v) => update('is_search_active', v)}
              label="Menü-Suche Aktivieren"
              description={localSettings.is_search_active ? 'Die Suchleiste wird im Header angezeigt' : 'Suchleiste ist ausgeblendet'}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschreibung <span className="text-gray-400 font-normal">(wird auf der Startseite angezeigt)</span></label>
            <textarea
              value={localSettings.description || ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="z.B. Frische Schawarma aus Nordstemmen – täglich frisch zubereitet."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#142328]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags <span className="text-gray-400 font-normal">(z.B. Food • Burger • Halal)</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(localSettings.tags || []).map(tag => (
                <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Tag eingeben und Enter drücken..."
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#142328]"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-[#142328] text-white rounded-xl hover:bg-[#1e3540] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ImageIcon size={18} className="text-[#142328]" />
          Hero-Bild (Startseiten-Banner)
        </h2>

        <div className="mb-6">
          <Toggle
            checked={localSettings.is_hero_active}
            onChange={(v) => update('is_hero_active', v)}
            label="Banner Aktiv/Inaktiv"
            description={localSettings.is_hero_active ? 'Banner wird auf der Startseite angezeigt' : 'Banner ist ausgeblendet'}
          />
        </div>

        {/* Preview */}
        {localSettings.hero_images?.[0] ? (
          <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100 mb-4 group">
            <img src={localSettings.hero_images[0]} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                className="flex items-center gap-2 bg-white text-gray-900 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Upload size={14} />
                Ersetzen
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => heroInputRef.current?.click()}
            className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#142328] hover:bg-gray-100 transition-all mb-4"
          >
            {isUploadingHero ? (
              <>
                <div className="w-8 h-8 border-4 border-[#142328] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Wird hochgeladen...</p>
              </>
            ) : (
              <>
                <Upload size={28} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Klicken zum Hochladen</p>
                <p className="text-xs text-gray-400">JPG, PNG, WebP · Empfohlen: 1600 × 400 px</p>
              </>
            )}
          </div>
        )}

        <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {pendingHeroUrl && (
            <Button
              variant="primary"
              isLoading={isSavingHero}
              onClick={async () => {
                setIsSavingHero(true)
                try {
                  await updateSettings({ ...localSettings!, hero_images: [pendingHeroUrl] })
                  setPendingHeroUrl(null)
                  toast.success('Hero-Bild gespeichert!')
                } catch (err: any) {
                  toast.error((t) => (
                    <span className="flex items-center gap-2">
                      Fehler: {err.message}
                      <button onClick={() => toast.dismiss(t.id)} className="ml-2 font-bold opacity-70 hover:opacity-100">✕</button>
                    </span>
                  ), { duration: Infinity })
                } finally {
                  setIsSavingHero(false)
                }
              }}
            >
              <Save size={14} />
              Bild speichern
            </Button>
          )}
          {localSettings.hero_images?.[0] && !pendingHeroUrl && (
            <button
              type="button"
              onClick={async () => {
                update('hero_images', [])
                await updateSettings({ ...localSettings!, hero_images: [] })
                toast.success('Hero-Bild entfernt')
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
              <X size={14} />
              Bild entfernen
            </button>
          )}
          {!localSettings.hero_images?.[0] && !isUploadingHero && !pendingHeroUrl && (
            <button
              type="button"
              onClick={() => heroInputRef.current?.click()}
              className="flex items-center gap-2 text-sm font-bold text-[#142328] hover:underline"
            >
              <Upload size={14} />
              Bild hochladen
            </button>
          )}
        </div>
      </div>

      {/* Delivery Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Truck size={18} className="text-[#142328]" />
          Lieferservice
        </h2>
        <div className="space-y-4">
          <Toggle
            checked={localSettings.is_delivery_active}
            onChange={(v) => update('is_delivery_active', v)}
            label="Lieferung aktiv"
            description={localSettings.is_delivery_active ? 'Kunden können Bestellungen aufgeben' : 'Keine Bestellungen möglich'}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Liefergebühr (€)"
              type="number"
              step="0.50"
              value={localSettings.delivery_fee}
              onChange={(e) => update('delivery_fee', parseFloat(e.target.value))}
              leftIcon={<Euro size={14} />}
            />
            <Input
              label="Mindestbestellung (€)"
              type="number"
              step="1"
              value={localSettings.min_order_amount}
              onChange={(e) => update('min_order_amount', parseFloat(e.target.value))}
              leftIcon={<Euro size={14} />}
            />
          </div>
          <Input
            label="Geschätzte Lieferzeit (Min.)"
            type="number"
            value={localSettings.estimated_delivery_time}
            onChange={(e) => update('estimated_delivery_time', parseInt(e.target.value))}
            leftIcon={<Clock size={14} />}
          />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Euro size={18} className="text-[#142328]" />
          Zahlungsmethoden
        </h2>
        <div className="space-y-4">
          <Toggle
            checked={localSettings.payment_methods?.cash ?? true}
            onChange={(v) => update('payment_methods', { ...localSettings.payment_methods, cash: v })}
            label="Barzahlung bei Lieferung"
            description="Kunden können bar an der Haustür bezahlen"
          />
          <Toggle
            checked={localSettings.payment_methods?.card_on_delivery ?? true}
            onChange={(v) => update('payment_methods', { ...localSettings.payment_methods, card_on_delivery: v })}
            label="Kartenzahlung bei Lieferung"
            description="Kunden können mit EC-Karte/Kreditkarte an der Haustür bezahlen"
          />
          {(!localSettings.payment_methods?.cash && !localSettings.payment_methods?.card_on_delivery) && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-700 text-xs">
              <Bell size={14} className="mt-0.5 shrink-0" />
              <p>Achtung: Du hast alle Zahlungsmethoden deaktiviert. Kunden können keine Bestellungen abschließen!</p>
            </div>
          )}
        </div>
      </div>

      {/* Opening Hours */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-[#142328]" />
          Öffnungszeiten
        </h2>
        <div className="divide-y divide-gray-50">
          {DAYS.map((day) => {
            const h = hours[day.key]
            return (
              <div key={day.key} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-bold text-gray-900 w-24">{day.label}</span>
                    <Toggle
                      checked={!h?.is_closed}
                      onChange={(v) => updateHours(day.key, 'is_closed', !v)}
                      size="sm"
                    />
                  </div>
                  {h?.is_closed && (
                    <span className="text-xs font-black text-red-500 uppercase tracking-wider bg-red-50 px-2 py-1 rounded-lg">Geschlossen</span>
                  )}
                </div>
                
                {!h?.is_closed && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">Von</span>
                      <input
                        type="time"
                        value={h?.open || '11:30'}
                        onChange={(e) => updateHours(day.key, 'open', e.target.value)}
                        className="w-full text-sm font-bold border border-gray-200 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#142328] bg-gray-50/50"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">Bis</span>
                      <input
                        type="time"
                        value={h?.close || '22:00'}
                        onChange={(e) => updateHours(day.key, 'close', e.target.value)}
                        className="w-full text-sm font-bold border border-gray-200 rounded-xl pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#142328] bg-gray-50/50"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Announcement */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Bell size={18} className="text-[#142328]" />
          Ankündigung / Banner
        </h2>
        <div className="space-y-3">
          <Toggle
            checked={localSettings.is_announcement_active}
            onChange={(v) => update('is_announcement_active', v)}
            label="Ankündigung anzeigen"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nachricht</label>
            <textarea
              value={localSettings.announcement || ''}
              onChange={(e) => update('announcement', e.target.value)}
              placeholder="z.B. Heute Abend: Happy Hour von 17–19 Uhr!"
              rows={2}
              disabled={!localSettings.is_announcement_active}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#142328] disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Map Mode Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MapIcon size={18} className="text-[#142328]" />
          Karten-Modus
        </h2>
        <div className="space-y-3">
          <Toggle
            checked={localSettings.is_map_mode_active}
            onChange={(v) => update('is_map_mode_active', v)}
            label="Karten-Modus (Aktiv/Inaktiv)"
            description={localSettings.is_map_mode_active ? 'Kartenbereich wird auf der Startseite angezeigt' : 'Kartenbereich ist ausgeblendet'}
          />
        </div>
      </div>

      {/* Coupons — managed in Kampagnen */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-2">Gutscheincodes</h2>
        <p className="text-sm text-gray-500 mb-3">Gutscheincodes werden über die Kampagnen-Seite verwaltet.</p>
        <a href="/admin/kampagnen" className="text-sm font-bold text-[#06c167] hover:underline">→ Zu Kampagnen</a>
      </div>

      {/* Floating Save Bar for Mobile/POS */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-40 lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
        <Button variant="primary" fullWidth size="lg" isLoading={isSaving} onClick={handleSave} className="h-14 text-base shadow-xl shadow-[#142328]/20">
          <Save size={20} />
          Einstellungen speichern
        </Button>
      </div>

      {/* Desktop Save Button */}
      <div className="hidden lg:flex justify-end">
        <Button variant="primary" size="lg" isLoading={isSaving} onClick={handleSave}>
          <Save size={16} />
          Einstellungen speichern
        </Button>
      </div>
    </div>
  )
}
