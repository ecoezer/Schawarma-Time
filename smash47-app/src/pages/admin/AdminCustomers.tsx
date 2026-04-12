import { useEffect, useState } from 'react'
import { Search, Mail, Phone, Calendar, ShoppingBag, User as UserIcon, X, MapPin, Clock, Euro } from 'lucide-react'
import * as customerService from '@/services/customerService'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatPrice, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import { handleError } from '@/lib/errorHandler'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Order, Customer } from '@/types'

export function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerOrders, setCustomerOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  useEffect(() => {
    fetchCustomersData()
  }, [])

  const fetchCustomersData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await customerService.fetchCustomers(0)
      setCustomers(data)
    } catch (err) {
      const msg = handleError(err, 'Kunden laden')
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsLoadingOrders(true)
    try {
      const data = await customerService.fetchCustomerOrders(customer.id)
      setCustomerOrders(data)
    } catch (err) {
      handleError(err, 'Kundenbestellungen laden')
      setCustomerOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const customerTotalSpent = customerOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total || 0), 0)

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
                        onClick={() => fetchCustomersData()}
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
                      <button
                        onClick={() => openCustomerDetail(customer)}
                        className="text-sm font-bold text-[#142328] hover:underline"
                      >
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

      {/* Customer Detail Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => { setSelectedCustomer(null); setCustomerOrders([]) }}
        title="Kundendetails"
        size="lg"
      >
        {selectedCustomer && (
          <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Customer Info */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#142328] flex items-center justify-center text-white text-xl font-bold shrink-0">
                {selectedCustomer.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-gray-900">{selectedCustomer.full_name || 'Unbekannt'}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} className="text-gray-400" />
                    {selectedCustomer.email}
                  </span>
                  {selectedCustomer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} className="text-gray-400" />
                      {selectedCustomer.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400" />
                    Seit {format(new Date(selectedCustomer.created_at), 'dd. MMM yyyy', { locale: de })}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-gray-900">{customerOrders.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Bestellungen</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-gray-900">{formatPrice(customerTotalSpent)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Gesamtumsatz</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-gray-900">{selectedCustomer.loyalty_points || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">Treuepunkte</p>
              </div>
            </div>

            {/* Addresses */}
            {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin size={16} className="text-[#142328]" />
                  Gespeicherte Adressen
                </h3>
                <div className="space-y-2">
                  {selectedCustomer.addresses.map((addr) => (
                    <div key={addr.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                      <MapPin size={14} className="text-gray-400 shrink-0" />
                      <div>
                        <span className="text-sm font-bold text-gray-700">{addr.label}: </span>
                        <span className="text-sm text-gray-500">{addr.street}, {addr.postal_code} {addr.city}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order History */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#142328]" />
                Bestellverlauf
              </h3>
              {isLoadingOrders ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="w-6 h-6 border-3 border-[#142328] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Lädt Bestellungen...
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Noch keine Bestellungen</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerOrders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-xl p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-gray-900">{order.order_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatDate(order.created_at)}
                          </span>
                          <span>{order.items.length} Artikel</span>
                        </div>
                        <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
                      </div>
                      {/* Order items summary */}
                      <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-0.5">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <p key={idx} className="text-xs text-gray-500">
                            {item.quantity}× {item.product_name}
                            {item.extras && item.extras.length > 0 && (
                              <span className="text-gray-400"> + {item.extras.map(e => e.name).join(', ')}</span>
                            )}
                          </p>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs text-gray-400">+{order.items.length - 3} weitere...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" fullWidth onClick={() => { setSelectedCustomer(null); setCustomerOrders([]) }}>
                Schließen
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
