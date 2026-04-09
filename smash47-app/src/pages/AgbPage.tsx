import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function AgbPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors">
          <ChevronLeft size={16} /> Zurück zur Startseite
        </Link>
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-3xl font-black text-[#142328] mb-6">Allgemeine Geschäftsbedingungen (AGB)</h1>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-lg font-bold text-gray-900">§ 1 Geltungsbereich</h2>
              <p>Diese AGB gelten für alle Bestellungen, die über die Website von Smash47 aufgegeben werden.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">§ 2 Vertragsschluss</h2>
              <p>Mit dem Klicken auf „Jetzt bestellen" geben Sie eine verbindliche Bestellung ab. Der Vertrag kommt zustande, wenn wir Ihre Bestellung per E-Mail bestätigen.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">§ 3 Preise und Zahlungsbedingungen</h2>
              <p>Alle Preise sind Endpreise inkl. der gesetzlichen MwSt. Die Bezahlung erfolgt bei Lieferung (bar oder mit Karte).</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">§ 4 Lieferung</h2>
              <p>Die Lieferzeit beträgt ca. 30–50 Minuten nach Bestelleingang. Bei höherem Bestellaufkommen kann sich die Lieferzeit verlängern. Lieferung erfolgt innerhalb des Liefergebiets von Smash47.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">§ 5 Widerrufsrecht</h2>
              <p>Da es sich um frisch zubereitete Lebensmittel handelt, besteht gemäß § 312g Abs. 2 Nr. 9 BGB kein Widerrufsrecht. Eine Stornierung ist nur bis zur Bestätigung der Bestellung möglich.</p>
            </section>
            <section>
              <h2 className="text-lg font-bold text-gray-900">§ 6 Kontakt</h2>
              <p>Smash47 · Bahnhofsallee 14a · 31134 Hildesheim · info@smash47.de</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
