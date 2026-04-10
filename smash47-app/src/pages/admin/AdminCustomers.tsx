import { useEffect, useState } from 'react'
import { Search, Mail, Phone, Calendar, ShoppingBag, User as UserIcon, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Customer {
  id: string
  full_name: string
  email: string
  phone: string | null
  total_orders: number
  created_at: string
}

export function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: sbError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (sbError) throw sbError
      setCustomers(data || [])
    } catch (err: any) {
      console.error('Error fetching customers:', err)
      setError(err.message || 'Unbekannter Fehler')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-gray-900">Kunden verwalten</h1>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Kunden suchen..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kunde</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kontakt</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Bestellungen</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Registriert am</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-[#142328] border-t-transparent rounded-full animate-spin mb-4" />
                      Lädt Kunden...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center text-red-500">
                      <Mail size={32} className="mb-2 opacity-50" />
                      <p className="font-bold">{error}</p>
                      <button 
                        onClick={() => fetchCustomers()} 
                        className="mt-4 text-sm underline hover:text-red-600"
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <UserIcon size={40} className="mb-3 opacity-20" />
                      <p>Keine Kunden gefunden</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">
                            {customer.full_name || 'Unbekannt'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">ID: {customer.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" />
                          {customer.email}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="success" className="bg-gray-100 border-none text-gray-700">
                        <ShoppingBag size={12} className="mr-1" />
                        {customer.total_orders || 0}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {format(new Date(customer.created_at), 'dd. MMM yyyy', { locale: de })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-bold text-[#142328] hover:underline">
                        Details ansehen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
