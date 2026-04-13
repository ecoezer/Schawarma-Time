import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          <ChevronLeft size={16} /> Zurück zur Startseite
        </Link>
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-3xl font-black text-[#142328] mb-6">Datenschutzerklärung</h1>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-gray-900">1. Datenschutz auf einen Blick</h2>
              <p>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Ihre Daten werden im Rahmen der gesetzlichen Datenschutzvorschriften und entsprechend dieser Datenschutzerklärung erhoben und verarbeitet.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
              <p>Wir erheben personenbezogene Daten (Name, Adresse, E-Mail, Telefonnummer) nur, wenn Sie eine Bestellung aufgeben. Diese Daten werden ausschließlich zur Bestellabwicklung und Lieferung verwendet und nicht an Dritte weitergegeben.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">3. Cookies</h2>
              <p>Wir verwenden technisch notwendige Cookies zur Bereitstellung unserer Dienste (z.B. Warenkorb). Optionale Analyse-Cookies werden nur mit Ihrer ausdrücklichen Einwilligung gesetzt.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">4. Ihre Rechte</h2>
              <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten. Kontaktieren Sie uns unter: datenschutz@schawarma-time.de</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">5. Verantwortliche Stelle</h2>
              <p>Schawarma-Time · Bahnhofsallee 14a · 31134 Hildesheim · info@schawarma-time.de</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
