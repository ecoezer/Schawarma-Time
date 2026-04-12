import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// v11: RESEND_API_KEY now uses the same fail-closed guard pattern as WEBHOOK_SECRET.
// Previously used a non-null assertion (!), which is compile-time only — at runtime
// in Deno, a missing key would result in "Authorization: Bearer undefined" being sent
// to Resend, causing a silent 401 failure with no early error.
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

// Service-role client for webhook replay guard — re-queries live DB status
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const DOMAIN_VERIFIED = Deno.env.get('RESEND_DOMAIN_VERIFIED') === 'true'
const FROM_EMAIL = DOMAIN_VERIFIED
  ? 'Smash47 <bestellung@smash47.de>'
  : 'Smash47 <onboarding@resend.dev>'
const RESTAURANT_EMAIL = 'smash47@skymail.de'

// ── H-1: Timing-safe string comparison ───────────────────────────────────────
// Prevents timing-based secret enumeration attacks on the webhook endpoint.
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  if (aBytes.length !== bBytes.length) {
    // Still consume time proportional to `a` to avoid length oracle
    let diff = 0
    for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ (bBytes[i % bBytes.length] ?? 0)
    return false
  }
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

// ── H-2: HTML escape all user-supplied fields before embedding in email HTML ──
// Prevents HTML injection in confirmation emails sent to customers/restaurant.
// customer_name, delivery_address, notes, and order items all come from
// attacker-controlled input stored in the DB — must be escaped before rendering.
function escHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;')
}

interface OrderRecord {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  items: {
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  subtotal: number
  delivery_fee: number
  discount_amount: number
  coupon_code: string | null
  total: number
  payment_method: string
  estimated_delivery_time: number
  notes: string | null
  created_at: string
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatPayment(method: string): string {
  return method === 'cash' ? 'Barzahlung bei Lieferung' : 'Kartenzahlung bei Lieferung'
}

function buildEmailHtml(order: OrderRecord): string {
  // H-2: all user-supplied fields are escaped before HTML interpolation
  const safeName    = escHtml(order.customer_name)
  const safeAddress = escHtml(order.delivery_address)
  const safeNotes   = escHtml(order.notes)
  const safeOrderNo = escHtml(order.order_number)   // server-generated but escape anyway

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
        <span style="font-weight:600;">${item.quantity}× ${escHtml(item.product_name)}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">
        ${formatPrice(item.subtotal)}
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#142328;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
          <div style="width:56px;height:56px;background:white;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-weight:900;font-size:18px;color:#142328;">S47</span>
          </div>
          <h1 style="margin:0;color:white;font-size:24px;font-weight:900;">Bestellung bestätigt! 🎉</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:15px;">Deine Bestellung wird sofort zubereitet.</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:white;padding:32px;">

          <p style="margin:0 0 24px;font-size:16px;color:#333;">
            Hallo <strong>${safeName}</strong>,<br>
            vielen Dank für deine Bestellung bei <strong>Smash47</strong>!
          </p>

          <!-- Order Number -->
          <div style="background:#f6f6f6;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Bestellnummer</p>
            <p style="margin:0;font-size:22px;font-weight:900;color:#142328;">${safeOrderNo}</p>
          </div>

          <!-- Items -->
          <h2 style="font-size:16px;font-weight:700;color:#142328;margin:0 0 12px;">Deine Bestellung</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            ${itemsHtml}
          </table>

          <!-- Price breakdown -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="padding:4px 0;color:#666;font-size:14px;">Zwischensumme</td>
              <td style="padding:4px 0;color:#666;font-size:14px;text-align:right;">${formatPrice(order.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:#666;font-size:14px;">Liefergebühr</td>
              <td style="padding:4px 0;color:#666;font-size:14px;text-align:right;">${formatPrice(order.delivery_fee)}</td>
            </tr>
            ${order.discount_amount > 0 ? `
            <tr>
              <td style="padding:4px 0;color:#06c167;font-size:14px;font-weight:600;">Rabatt${order.coupon_code ? ` (${escHtml(order.coupon_code)})` : ''}</td>
              <td style="padding:4px 0;color:#06c167;font-size:14px;font-weight:600;text-align:right;">-${formatPrice(order.discount_amount)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:12px 0 0;font-size:18px;font-weight:900;color:#142328;border-top:2px solid #f0f0f0;">Gesamt</td>
              <td style="padding:12px 0 0;font-size:18px;font-weight:900;color:#142328;text-align:right;border-top:2px solid #f0f0f0;">${formatPrice(order.total)}</td>
            </tr>
          </table>

          <!-- Delivery info -->
          <div style="background:#f6f6f6;border-radius:12px;padding:20px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;">
                  <span style="font-size:13px;color:#888;">📍 Lieferadresse</span><br>
                  <span style="font-size:14px;font-weight:600;color:#333;">${safeAddress}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0 4px;">
                  <span style="font-size:13px;color:#888;">🕐 Geschätzte Lieferzeit</span><br>
                  <span style="font-size:14px;font-weight:600;color:#333;">${order.estimated_delivery_time}–${order.estimated_delivery_time + 10} Minuten</span>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;">
                  <span style="font-size:13px;color:#888;">💳 Zahlung</span><br>
                  <span style="font-size:14px;font-weight:600;color:#333;">${formatPayment(order.payment_method)}</span>
                </td>
              </tr>
              ${safeNotes ? `
              <tr>
                <td style="padding:8px 0 4px;">
                  <span style="font-size:13px;color:#888;">📝 Anmerkungen</span><br>
                  <span style="font-size:14px;font-weight:600;color:#333;">${safeNotes}</span>
                </td>
              </tr>` : ''}
            </table>
          </div>

          <p style="margin:0;font-size:14px;color:#888;text-align:center;">
            Bei Fragen erreichst du uns unter<br>
            <a href="tel:051213030551" style="color:#142328;font-weight:700;">05121 3030551</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f0f0f0;border-radius:0 0 16px 16px;padding:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#999;">
            Smash47 · Bahnhofsallee 14a · 31134 Hildesheim<br>
            <a href="https://smash47.netlify.app" style="color:#142328;">smash47.netlify.app</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `
}

function buildRejectedEmailHtml(order: OrderRecord): string {
  const safeName    = escHtml(order.customer_name)
  const safeOrderNo = escHtml(order.order_number)

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#142328;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
          <div style="width:56px;height:56px;background:white;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-weight:900;font-size:18px;color:#142328;">S47</span>
          </div>
          <h1 style="margin:0;color:white;font-size:24px;font-weight:900;">Bestellung abgelehnt 😔</h1>
        </td></tr>
        <tr><td style="background:white;padding:32px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 16px;font-size:16px;color:#333;">
            Hallo <strong>${safeName}</strong>,<br>
            leider konnten wir deine Bestellung <strong>${safeOrderNo}</strong> aufgrund von hoher Auslastung nicht annehmen.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;">
            Bitte ruf uns an, wir helfen dir gerne weiter:
          </p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="tel:051213030551" style="display:inline-block;background:#142328;color:white;font-weight:900;font-size:18px;padding:14px 32px;border-radius:12px;text-decoration:none;">
              05121 3030551
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#999;text-align:center;">
            Smash47 · Bahnhofsallee 14a · 31134 Hildesheim
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `
}

serve(async (req) => {
  try {
    // Fail CLOSED: if either secret/key is not configured, refuse ALL requests.
    const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')
    if (!WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET is not configured — refusing all requests')
      return new Response('Misconfigured', { status: 401 })
    }

    // v11: explicit guard — mirrors the WEBHOOK_SECRET pattern above.
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured — cannot send emails')
      return new Response('Misconfigured', { status: 500 })
    }

    // H-1: timing-safe comparison — prevents secret enumeration via timing
    const incomingSecret = req.headers.get('x-webhook-secret') ?? ''
    if (!timingSafeEqual(incomingSecret, WEBHOOK_SECRET)) {
      console.error('Unauthorized webhook call — invalid secret')
      return new Response('Unauthorized', { status: 401 })
    }

    const payload = await req.json()

    const order: OrderRecord = payload.record
    const oldStatus: string = payload.old_record?.status ?? ''
    const newStatus: string = order?.status ?? ''

    if (!order?.customer_email) {
      return new Response('No email', { status: 400 })
    }

    if (newStatus === oldStatus) {
      return new Response('No status change', { status: 200 })
    }

    if (newStatus !== 'confirmed' && newStatus !== 'cancelled') {
      return new Response('Status not relevant', { status: 200 })
    }

    // Webhook replay guard: re-query the LIVE order status from DB.
    // If the current DB status no longer matches the webhook payload's new status,
    // this is a replayed or stale webhook — skip silently.
    const { data: liveOrder } = await supabaseAdmin
      .from('orders')
      .select('status')
      .eq('id', order.id)
      .single()

    if (!liveOrder || liveOrder.status !== newStatus) {
      console.log(`Replay guard: live status=${liveOrder?.status}, webhook status=${newStatus} — skipping`)
      return new Response('Stale webhook', { status: 200 })
    }

    const isConfirmed = newStatus === 'confirmed'
    const html = isConfirmed ? buildEmailHtml(order) : buildRejectedEmailHtml(order)

    const toAddresses = DOMAIN_VERIFIED ? [order.customer_email] : [RESTAURANT_EMAIL]

    const emailPayload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: toAddresses,
      subject: isConfirmed
        ? `Bestellung ${escHtml(order.order_number)} bestätigt – Smash47`
        : `Bestellung ${escHtml(order.order_number)} abgelehnt – Smash47`,
      html,
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)  // server-side only — never exposed to caller
      return new Response('Email delivery failed', { status: 500 })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Edge function error:', msg)
    return new Response('Internal error', { status: 500 })
  }
})
