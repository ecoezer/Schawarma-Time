import { auth } from '@/lib/firebase'
import type { OrderStatus } from '@/types'

export async function sendOrderStatusEmail(orderId: string, status: OrderStatus): Promise<void> {
  if (status !== 'confirmed' && status !== 'cancelled') return
  if (!auth.currentUser) throw new Error('Keine aktive Admin-Sitzung für Mailversand gefunden.')

  const idToken = await auth.currentUser.getIdToken()
  const res = await fetch('/api/order-status-email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderId, status }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || 'Status-E-Mail konnte nicht gesendet werden.')
  }
}
