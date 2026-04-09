import { Tag, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function AdminCampaigns() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900">Kampagnen & Rabatte</h1>
        <Button variant="primary">
          <Plus size={16} />
          Neue Kampagne
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-4">
            <Tag size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Keine aktiven Kampagnen</h3>
          <p className="text-gray-500 mt-1 max-w-xs mx-auto">
            Erstellen Sie Gutscheincodes oder Rabattaktionen, um Ihre Verkäufe zu steigern.
          </p>
          <Button variant="outline" className="mt-6">
            Erste Kampagne erstellen
          </Button>
        </div>
      </div>
    </div>
  )
}
