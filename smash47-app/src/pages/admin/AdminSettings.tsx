import { useState, useEffect } from 'react'
import { Clock, Truck, Euro, Bell, Save, RefreshCw, Store, X, Plus } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useRestaurantStore } from '@/store/restaurantStore'
import type { RestaurantSettings } from '@/types'
import toast from 'react-hot-toast'

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
      toast.error('Fehler beim Speichern: ' + err.message)
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

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-gray-900">Einstellungen</h1>

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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschreibung <span className="text-gray-400 font-normal">(wird auf der Startseite angezeigt)</span></label>
            <textarea
              value={localSettings.description || ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="z.B. Frische Smash Burger aus Hildesheim – täglich frisch zubereitet."
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

      {/* Opening Hours */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-[#142328]" />
          Öffnungszeiten
        </h2>
        <div className="space-y-3">
          {DAYS.map((day) => {
            const h = hours[day.key]
            return (
              <div key={day.key} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium text-gray-700">{day.label}</div>
                <Toggle
                  checked={!h?.is_closed}
                  onChange={(v) => updateHours(day.key, 'is_closed', !v)}
                  size="sm"
                />
                {!h?.is_closed ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={h?.open || '11:30'}
                      onChange={(e) => updateHours(day.key, 'open', e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#142328]"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="time"
                      value={h?.close || '22:00'}
                      onChange={(e) => updateHours(day.key, 'close', e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#142328]"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-red-500 font-medium">Geschlossen</span>
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

      {/* Coupons — managed in Kampagnen */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-2">Gutscheincodes</h2>
        <p className="text-sm text-gray-500 mb-3">Gutscheincodes werden über die Kampagnen-Seite verwaltet.</p>
        <a href="/admin/kampagnen" className="text-sm font-bold text-[#06c167] hover:underline">→ Zu Kampagnen</a>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="primary" size="lg" isLoading={isSaving} onClick={handleSave}>
          <Save size={16} />
          Einstellungen speichern
        </Button>
      </div>
    </div>
  )
}
