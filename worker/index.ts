type FirestoreField =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields?: Record<string, FirestoreField> } }
  | { arrayValue: { values?: FirestoreField[] } }
  | { timestampValue: string }

interface Env {
  ASSETS: Fetcher
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
  FIREBASE_PROJECT_ID: string
  FIREBASE_API_KEY: string
}

interface OrderItem {
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

interface OrderRecord {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  items: OrderItem[]
  subtotal: number
  delivery_fee: number
  discount_amount: number
  coupon_code: string | null
  total: number
  payment_method: string
  estimated_delivery_time: number | null
  notes: string | null
  status: string
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  })
}

function escHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatPayment(method: string): string {
  return method === 'cash' ? 'Barzahlung bei Lieferung' : 'Kartenzahlung bei Lieferung'
}

function parseField(field: FirestoreField | undefined): any {
  if (!field) return null
  if ('stringValue' in field) return field.stringValue
  if ('integerValue' in field) return Number(field.integerValue)
  if ('doubleValue' in field) return field.doubleValue
  if ('booleanValue' in field) return field.booleanValue
  if ('nullValue' in field) return null
  if ('timestampValue' in field) return field.timestampValue
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(parseField)
  if ('mapValue' in field) {
    const out: Record<string, any> = {}
    for (const [key, value] of Object.entries(field.mapValue.fields || {})) {
      out[key] = parseField(value)
    }
    return out
  }
  return null
}

function parseDocument(doc: any): Record<string, any> {
  const fields = doc?.fields || {}
  const parsed: Record<string, any> = {}
  for (const [key, value] of Object.entries(fields)) {
    parsed[key] = parseField(value as FirestoreField)
  }
  return parsed
}

async function verifyFirebaseUser(idToken: string, env: Env): Promise<{ localId: string; email?: string }> {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })

  if (!res.ok) {
    throw new Error('Ungültige Firebase-Sitzung')
  }

  const data = await res.json<any>()
  const user = data?.users?.[0]
  if (!user?.localId) throw new Error('Firebase-Benutzer konnte nicht geprüft werden')
  return user
}

async function fetchFirestoreDocument(path: string, idToken: string, env: Env): Promise<Record<string, any> | null> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    },
  )

  if (res.status === 404) return null
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Firestore read failed: ${text}`)
  }

  return parseDocument(await res.json<any>())
}

function buildConfirmedEmailHtml(order: OrderRecord): string {
  const itemsHtml = order.items.map((item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <strong>${item.quantity}× ${escHtml(item.product_name)}</strong>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">
        ${formatPrice(item.subtotal)}
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#142328;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">Bestellung bestätigt</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:15px;">Deine Bestellung wird jetzt bearbeitet.</p>
        </td></tr>
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 20px;font-size:16px;color:#333;">Hallo <strong>${escHtml(order.customer_name)}</strong>,</p>
          <div style="background:#f6f6f6;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Bestellnummer</p>
            <p style="margin:0;font-size:22px;font-weight:900;color:#142328;">${escHtml(order.order_number)}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${itemsHtml}</table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:4px 0;color:#666;">Zwischensumme</td><td style="padding:4px 0;color:#666;text-align:right;">${formatPrice(order.subtotal)}</td></tr>
            <tr><td style="padding:4px 0;color:#666;">Liefergebühr</td><td style="padding:4px 0;color:#666;text-align:right;">${formatPrice(order.delivery_fee)}</td></tr>
            ${order.discount_amount > 0 ? `<tr><td style="padding:4px 0;color:#06c167;font-weight:600;">Rabatt</td><td style="padding:4px 0;color:#06c167;font-weight:600;text-align:right;">-${formatPrice(order.discount_amount)}</td></tr>` : ''}
            <tr><td style="padding:12px 0 0;font-size:18px;font-weight:900;color:#142328;border-top:2px solid #f0f0f0;">Gesamt</td><td style="padding:12px 0 0;font-size:18px;font-weight:900;color:#142328;text-align:right;border-top:2px solid #f0f0f0;">${formatPrice(order.total)}</td></tr>
          </table>
          <div style="background:#f6f6f6;border-radius:12px;padding:20px;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">Geschätzte ${order.delivery_address === 'Selbstabholung' ? 'Abholzeit' : 'Lieferzeit'}</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#142328;">${order.estimated_delivery_time ?? 35}–${(order.estimated_delivery_time ?? 35) + 10} Minuten</p>
            <p style="margin:16px 0 8px;font-size:13px;color:#888;">Zahlung</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#333;">${formatPayment(order.payment_method)}</p>
            ${order.notes ? `<p style="margin:16px 0 8px;font-size:13px;color:#888;">Anmerkung</p><p style="margin:0;font-size:14px;font-weight:600;color:#333;">${escHtml(order.notes)}</p>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildCancelledEmailHtml(order: OrderRecord): string {
  return `
<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#142328;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">Bestellung abgelehnt</h1>
        </td></tr>
        <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 16px;font-size:16px;color:#333;">
            Hallo <strong>${escHtml(order.customer_name)}</strong>, leider konnten wir deine Bestellung <strong>${escHtml(order.order_number)}</strong> aktuell nicht annehmen.
          </p>
          <p style="margin:0;font-size:15px;color:#333;">
            Bitte kontaktiere uns direkt, falls du eine neue Bestellung aufgeben möchtest.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function handleOrderStatusEmail(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_API_KEY) {
    return json({ error: 'Mail worker misconfigured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return json({ error: 'Missing auth token' }, { status: 401 })

  const idToken = match[1]
  const { localId } = await verifyFirebaseUser(idToken, env)
  const profile = await fetchFirestoreDocument(`profiles/${localId}`, idToken, env)
  const role = profile?.role
  if (!['manager', 'cashier', 'kitchen'].includes(role)) {
    return json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json<any>()
  const orderId = String(body?.orderId || '')
  const status = String(body?.status || '')
  if (!orderId || !['confirmed', 'cancelled'].includes(status)) {
    return json({ error: 'Invalid payload' }, { status: 400 })
  }

  const orderDoc = await fetchFirestoreDocument(`orders/${orderId}`, idToken, env)
  if (!orderDoc) return json({ error: 'Order not found' }, { status: 404 })
  if (orderDoc.status !== status) {
    return json({ error: 'Order status mismatch' }, { status: 409 })
  }
  if (!orderDoc.customer_email) {
    return json({ error: 'Customer email missing' }, { status: 400 })
  }

  const html = status === 'confirmed'
    ? buildConfirmedEmailHtml(orderDoc as OrderRecord)
    : buildCancelledEmailHtml(orderDoc as OrderRecord)

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [orderDoc.customer_email],
      subject: status === 'confirmed'
        ? `Bestellung ${orderDoc.order_number} bestätigt – Schawarma-Time`
        : `Bestellung ${orderDoc.order_number} abgelehnt – Schawarma-Time`,
      html,
    }),
  })

  if (!resendRes.ok) {
    const text = await resendRes.text()
    return json({ error: 'Resend failed', detail: text }, { status: 502 })
  }

  return json({ ok: true })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/order-status-email') {
      try {
        return await handleOrderStatusEmail(request, env)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return json({ error: message }, { status: 500 })
      }
    }
    return env.ASSETS.fetch(request)
  },
}
