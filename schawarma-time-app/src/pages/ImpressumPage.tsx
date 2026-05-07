import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useRestaurantStore } from '@/store/restaurantStore'

export function ImpressumPage() {
  const { settings, fetchSettings } = useRestaurantStore()

  useEffect(() => {
    if (!settings) {
      void fetchSettings()
    }
  }, [settings, fetchSettings])

  const restaurantName = settings?.name || 'Schawarma-Time'
  const restaurantAddress = settings?.address || 'Adresse auf Anfrage'
  const restaurantPhone = settings?.phone || 'Telefon auf Anfrage'
  const restaurantEmail = settings?.email || 'info@schawarma-time.de'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          <ChevronLeft size={16} /> Zurück zur Startseite
        </Link>
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-3xl font-black text-[#142328] mb-6">Impressum</h1>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Angaben gemäß § 5 TMG</h2>
            <p><strong>{restaurantName}</strong><br />{restaurantAddress}<br />Deutschland</p>
            <h2 className="text-lg font-bold text-gray-900 mt-6">Kontakt</h2>
            <p>Telefon: {restaurantPhone}<br />E-Mail: {restaurantEmail}</p>
            <h2 className="text-lg font-bold text-gray-900 mt-6">Umsatzsteuer-ID</h2>
            <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: auf Anfrage</p>
            <h2 className="text-lg font-bold text-gray-900 mt-6">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p>{restaurantName}<br />{restaurantAddress}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
