import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateString))
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  // 4 random hex bytes (crypto-grade) → 8 hex chars, unguessable
  const random = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `ST-${timestamp}-${random}`
}

export function generateId(): string {
  return crypto.randomUUID()
}

// Single source of truth for order status display
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Ausstehend',      color: 'bg-yellow-100 text-yellow-800' },
  confirmed:  { label: 'Bestätigt',       color: 'bg-blue-100 text-blue-800' },
  preparing:  { label: 'In Zubereitung',  color: 'bg-orange-100 text-orange-800' },
  on_the_way: { label: 'Unterwegs',       color: 'bg-purple-100 text-purple-800' },
  delivered:  { label: 'Geliefert',       color: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Storniert',       color: 'bg-red-100 text-red-800' },
}

export function getStatusLabel(status: string): string {
  return STATUS_MAP[status]?.label || status
}

export function getStatusColor(status: string): string {
  return STATUS_MAP[status]?.color || 'bg-gray-100 text-gray-800'
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function isRestaurantOpen(hours: Record<string, { open: string; close: string; is_closed: boolean }>): boolean {
  if (!hours || Object.keys(hours).length === 0) return true
  const now = new Date()
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayHours = hours[days[now.getDay()]]
  if (!dayHours || dayHours.is_closed) return false
  const current = now.getHours() * 60 + now.getMinutes()
  const openMinutes = timeToMinutes(dayHours.open)
  const closeMinutes = timeToMinutes(dayHours.close)

  // Overnight opening window, e.g. 18:00 -> 02:00
  if (closeMinutes < openMinutes) {
    return current >= openMinutes || current <= closeMinutes
  }

  return current >= openMinutes && current <= closeMinutes
}

export function toArray<T>(data: T[] | null | undefined): T[] {
  return data ?? []
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
