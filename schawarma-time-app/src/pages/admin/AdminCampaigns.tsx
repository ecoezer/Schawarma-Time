import { useState, useEffect } from 'react'
import { Tag, Plus, Edit2, Trash2, Percent, Euro, Calendar, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import * as couponService from '@/services/couponService'
import type { Coupon } from '@/types'
import { formatPrice } from '@/lib/utils'
import { handleError } from '@/lib/errorHandler'
import toast from 'react-hot-toast'

const emptyCouponForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_amount: '15',
  max_uses: '',
  is_first_order_only: false,
  is_active: true,
  expires_at: '',
}

export function AdminCampaigns() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [form, setForm] = useState(emptyCouponForm)

  useEffect(() => {
    fetchCouponsData()
  }, [])

  const fetchCouponsData = async () => {
    setIsLoading(true)
    try {
      const data = await couponService.fetchCoupons()
      setCoupons(data)
    } catch (err) {
      handleError(err, 'Gutscheine laden')
    } finally {
      setIsLoading(false)
    }
  }

  const openAddModal = () => {
    setEditCoupon(null)
    setForm(emptyCouponForm)
    setIsModalOpen(true)
  }

  const openEditModal = (coupon: Coupon) => {
    setEditCoupon(coupon)
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount.toString(),
      max_uses: coupon.max_uses?.toString() || '',
      is_first_order_only: coupon.is_first_order_only,
      is_active: coupon.is_active,
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Gutscheincode ist erforderlich')
      return
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      toast.error('Rabattwert muss größer als 0 sein')
      return
    }

    setIsSubmitting(true)
    try {
      const couponData = {
        code: form.code.toUpperCase().trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        is_first_order_only: form.is_first_order_only,
        is_active: form.is_active,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      }

      if (editCoupon) {
        await couponService.updateCoupon(editCoupon.id, couponData)
        setCoupons(prev => prev.map(c => c.id === editCoupon.id ? { ...c, ...couponData } : c))
        toast.success('Gutschein aktualisiert!')
      } else {
        const created = await couponService.createCoupon(couponData as any)
        setCoupons(prev => [created, ...prev])
        toast.success('Gutschein erstellt!')
      }

      setIsModalOpen(false)
    } catch (err: any) {
      if (err.message?.includes('duplicate') || err.code === '23505') {
        toast.error('Dieser Gutscheincode existiert bereits')
      } else {
        handleError(err, 'Gutschein speichern')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCoupon = async (coupon: Coupon) => {
    const newActive = !coupon.is_active
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: newActive } : c))
    try {
      await couponService.updateCoupon(coupon.id, { is_active: newActive })
    } catch (err) {
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: coupon.is_active } : c))
      handleError(err, 'Gutschein aktualisieren')
    }
  }

  const deleteCouponItem = async (coupon: Coupon) => {
    try {
      await couponService.deleteCoupon(coupon.id)
      setCoupons(prev => prev.filter(c => c.id !== coupon.id))
      toast.success('Gutschein gelöscht')
    } catch (err) {
      handleError(err, 'Gutschein löschen')
    }
    setDeleteTarget(null)
  }

  const isExpired = (coupon: Coupon) =>
    coupon.expires_at && new Date(coupon.expires_at) < new Date()

  const isMaxedOut = (coupon: Coupon) =>
    coupon.max_uses !== null && coupon.used_count >= coupon.max_uses

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900">Kampagnen &amp; Rabatte</h1>
        <Button variant="primary" onClick={openAddModal}>
          <Plus size={16} />
          Neuer Gutschein
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-gray-900">{coupons.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Gutscheine gesamt</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-[#06c167]">{coupons.filter(c => c.is_active && !isExpired(c)).length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aktiv</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-black text-gray-900">{coupons.reduce((s, c) => s + c.used_count, 0)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Einlösungen gesamt</p>
        </div>
      </div>

      {/* Coupon List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
            <RefreshCw size={24} className="mx-auto mb-3 animate-spin" />
            Lädt Gutscheine...
          </div>
        ) : coupons.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-4">
                <Tag size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Keine Gutscheine vorhanden</h3>
              <p className="text-gray-500 mt-1 max-w-xs mx-auto">
                Erstelle Gutscheincodes oder Rabattaktionen, um Verkäufe zu steigern.
              </p>
              <Button variant="primary" className="mt-6" onClick={openAddModal}>
                <Plus size={16} />
                Ersten Gutschein erstellen
              </Button>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {coupons.map((coupon) => (
              <motion.div
                key={coupon.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${
                  !coupon.is_active || isExpired(coupon) || isMaxedOut(coupon) ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-black font-mono text-[#142328] tracking-wider">
                        {coupon.code}
                      </span>
                      {coupon.is_active && !isExpired(coupon) && !isMaxedOut(coupon) ? (
                        <Badge variant="success">Aktiv</Badge>
                      ) : isExpired(coupon) ? (
                        <Badge variant="danger">Abgelaufen</Badge>
                      ) : isMaxedOut(coupon) ? (
                        <Badge variant="warning">Aufgebraucht</Badge>
                      ) : (
                        <Badge variant="default">Inaktiv</Badge>
                      )}
                      {coupon.is_first_order_only && (
                        <Badge variant="info">Nur Erstbestellung</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        {coupon.discount_type === 'percentage' ? (
                          <><Percent size={14} className="text-gray-400" /> {coupon.discount_value}% Rabatt</>
                        ) : (
                          <><Euro size={14} className="text-gray-400" /> {formatPrice(coupon.discount_value)} Rabatt</>
                        )}
                      </span>

                      {coupon.min_order_amount > 0 && (
                        <span>ab {formatPrice(coupon.min_order_amount)}</span>
                      )}

                      <span>
                        {coupon.used_count}/{coupon.max_uses ?? '∞'} verwendet
                      </span>

                      {coupon.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-gray-400" />
                          bis {new Date(coupon.expires_at).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Toggle
                      checked={coupon.is_active}
                      onChange={() => toggleCoupon(coupon)}
                      size="sm"
                    />
                    <button
                      onClick={() => openEditModal(coupon)}
                      className="p-1.5 text-gray-400 hover:text-[#142328] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(coupon)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editCoupon ? 'Gutschein bearbeiten' : 'Neuer Gutschein'}
        size="md"
      >
        <div className="p-5 space-y-4">
          <Input
            label="Gutscheincode"
            placeholder="z.B. SOMMER20"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rabattart</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setForm({ ...form, discount_type: 'percentage' })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  form.discount_type === 'percentage'
                    ? 'border-[#142328] bg-[#142328]/5 text-[#142328]'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                <Percent size={16} />
                Prozentsatz
              </button>
              <button
                onClick={() => setForm({ ...form, discount_type: 'fixed' })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                  form.discount_type === 'fixed'
                    ? 'border-[#142328] bg-[#142328]/5 text-[#142328]'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                <Euro size={16} />
                Festbetrag
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={form.discount_type === 'percentage' ? 'Rabatt (%)' : 'Rabatt (€)'}
              type="number"
              step={form.discount_type === 'percentage' ? '1' : '0.50'}
              placeholder={form.discount_type === 'percentage' ? '10' : '5.00'}
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              required
            />
            <Input
              label="Mindestbestellung (€)"
              type="number"
              step="1"
              placeholder="15"
              value={form.min_order_amount}
              onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max. Einlösungen"
              type="number"
              placeholder="Unbegrenzt"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            />
            <Input
              label="Ablaufdatum"
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </div>

          <div className="space-y-3 pt-1">
            <Toggle
              checked={form.is_first_order_only}
              onChange={(v) => setForm({ ...form, is_first_order_only: v })}
              label="Nur für Erstbestellung"
              description="Gilt nur für Kunden ohne vorherige Bestellung"
            />
            <Toggle
              checked={form.is_active}
              onChange={(v) => setForm({ ...form, is_active: v })}
              label="Sofort aktivieren"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
            <Button variant="primary" fullWidth onClick={handleSave} isLoading={isSubmitting}>
              {editCoupon ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteCouponItem(deleteTarget)}
        title="Gutschein löschen?"
        message={`Möchtest du den Gutschein "${deleteTarget?.code}" wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        isDangerous={true}
      />
    </div>
  )
}
