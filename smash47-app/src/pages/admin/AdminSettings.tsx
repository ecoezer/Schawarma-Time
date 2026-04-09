import { useState } from 'react'
import { Clock, Truck, Euro, MapPin, Bell, Tag, Save } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { mockRestaurantSettings } from '@/data/mockData'
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
  const [settings, setSettings] = useState(mockRestaurantSettings)
  const [hours, setHours] = useState(mockRestaurantSettings.hours)
  const [isSaving, setIsSaving] = useState(false)

  const update = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const updateHours = (day: string, field: 'open' | 'close' | 'is_closed', value: string | boolean) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setIsSaving(false)
    toast.success('Einstellungen gespeichert!')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-black text-gray-900">Einstellungen</h1>

      {/* Delivery Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Truck size={18} className="text-[#142328]" />
          Lieferservice
        </h2>
        <div className="space-y-4">
          <Toggle
            checked={settings.is_delivery_active}
            onChange={(v) => update('is_delivery_active', v)}
            label="Lieferung aktiv"
            description={settings.is_delivery_active ? 'Kunden können Bestellungen aufgeben' : 'Keine Bestellungen möglich'}
            colorOn="bg-[#06c167]"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Liefergebühr (€)"
              type="number"
              step="0.50"
              value={settings.delivery_fee}
              onChange={(e) => update('delivery_fee', parseFloat(e.target.value))}
              leftIcon={<Euro size={14} />}
            />
            <Input
              label="Mindestbestellung (€)"
              type="number"
              step="1"
              value={settings.min_order_amount}
              onChange={(e) => update('min_order_amount', parseFloat(e.target.value))}
              leftIcon={<Euro size={14} />}
            />
          </div>
          <Input
            label="Geschätzte Lieferzeit (Min.)"
            type="number"
            value={settings.estimated_delivery_time}
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
            checked={settings.is_announcement_active}
            onChange={(v) => update('is_announcement_active', v)}
            label="Ankündigung anzeigen"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nachricht</label>
            <textarea
              value={settings.announcement || ''}
              onChange={(e) => update('announcement', e.target.value)}
              placeholder="z.B. Heute Abend: Happy Hour von 17–19 Uhr!"
              rows={2}
              disabled={!settings.is_announcement_active}
              className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#142328] disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Coupons */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Tag size={18} className="text-[#142328]" />
          Gutscheincodes
        </h2>
        <div className="space-y-2">
          {[
            { code: 'SMASH10', type: '10% Rabatt', uses: '12/∞', active: true },
            { code: 'WILLKOMMEN', type: '€3,00 Rabatt', uses: '5/100', active: true },
            { code: 'SOMMER24', type: '€5,00 Rabatt', uses: '100/100', active: false },
          ].map((coupon) => (
            <div key={coupon.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-bold font-mono">{coupon.code}</p>
                <p className="text-xs text-gray-500">{coupon.type} · {coupon.uses} verwendet</p>
              </div>
              <Toggle checked={coupon.active} onChange={() => {}} size="sm" />
            </div>
          ))}
        </div>
        <Button variant="ghost" className="mt-3 w-full border border-dashed border-gray-200">
          + Neuen Code erstellen
        </Button>
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
