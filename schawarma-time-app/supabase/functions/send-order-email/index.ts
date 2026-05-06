import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface OrderPayload {
  type: 'UPDATE' | 'INSERT'
  table: string
  record: {
    id: string
    order_number: string
    customer_name: string
    customer_email: string
    status: string
    total: number
    payment_method: string
  }
  old_record: {
    status: string
  } | null
}

const BRAND_COLOR = "#06c167"
const DARK_COLOR = "#142328"

function getBaseTemplate(content: string, title: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f6; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background-color: ${DARK_COLOR}; padding: 40px 20px; text-align: center; }
          .content { padding: 40px 30px; }
          .footer { background-color: #f8faf9; padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; }
          .button { display: inline-block; padding: 14px 28px; background-color: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 20px; }
          .order-box { background-color: #f8faf9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }
          h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
          h2 { margin: 0 0 16px 0; color: ${DARK_COLOR}; font-size: 20px; font-weight: 800; }
          .text-muted { color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SCHAWARMA-TIME</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© 2026 Schawarma-Time. Alle Rechte vorbehalten.</p>
            <p>Berliner Str. 123, 10115 Berlin</p>
            <p><a href="https://schawarma-time.de" style="color: ${BRAND_COLOR}; text-decoration: none;">www.schawarma-time.de</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

Deno.serve(async (req) => {
  try {
    const payload: OrderPayload = await req.json()
    console.log("📨 [Email Function] Received payload type:", payload.type)
    const { record, old_record, type } = payload

    if (!record.customer_email) {
      console.log("⚠️ [Email Function] No customer email, skipping.")
      return new Response(JSON.stringify({ message: 'No email' }), { status: 200 })
    }

    // Skip if status hasn't changed (for UPDATE)
    if (type === 'UPDATE' && record.status === old_record?.status) {
      console.log("ℹ️ [Email Function] Status unchanged, skipping.")
      return new Response(JSON.stringify({ message: 'Status unchanged' }), { status: 200 })
    }

    let subject = ''
    let content = ''
    const safeTotal = typeof record.total === 'number' ? record.total.toFixed(2) : '0.00'

    // LOGIC FOR DIFFERENT STATUSES
    if (type === 'INSERT' || (type === 'UPDATE' && record.status === 'pending')) {
      subject = `Neue Bestellung erhalten! 🌯 - ${record.order_number}`
      content = `
        <div class="status-badge" style="background: #fef3c7; color: #d97706;">BESTELLUNG EINGEGANGEN</div>
        <h2>Hallo ${record.customer_name},</h2>
        <p>Vielen Dank für Ihre Bestellung bei Schawarma-Time! Wir haben Ihre Bestellung erhalten ve en kısa sürede onaylayacağız.</p>
        <div class="order-box">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Bestellnummer</p>
          <p style="margin: 4px 0 16px 0; font-weight: 900; font-size: 18px; color: ${DARK_COLOR};">#${record.order_number}</p>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px;">
            <span>Gesamtbetrag:</span>
            <span style="font-weight: bold; color: ${DARK_COLOR};">€${safeTotal}</span>
          </div>
        </div>
      `
    } else if (record.status === 'confirmed') {
      subject = `Bestätigt: Ihre Bestellung wird vorbereitet! 🌯 - ${record.order_number}`
      content = `
        <div class="status-badge" style="background: #ecfdf5; color: ${BRAND_COLOR};">BESTELLUNG BESTÄTIGT</div>
        <h2>Hallo ${record.customer_name},</h2>
        <p>Wir haben Ihre Bestellung bestätigt! Unsere Köche bereiten alles frisch für Sie zu.</p>
        <div class="order-box">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Bestellnummer</p>
          <p style="margin: 4px 0 16px 0; font-weight: 900; font-size: 18px; color: ${DARK_COLOR};">#${record.order_number}</p>
        </div>
      `
    } else if (record.status === 'on_the_way') {
      subject = `Unterwegs: Ihre Bestellung ist gleich da! 🛵 - ${record.order_number}`
      content = `
        <div class="status-badge" style="background: #eff6ff; color: #3b82f6;">UNTERWEGS</div>
        <h2>Gute Neuigkeiten!</h2>
        <p>Ihre Bestellung ist nun auf dem Weg zu Ihnen. Guten Appetit!</p>
      `
    } else if (record.status === 'cancelled') {
      subject = `Storniert: Information zu Ihrer Bestellung - ${record.order_number}`
      content = `
        <div class="status-badge" style="background: #fef2f2; color: #ef4444;">STORNIERT</div>
        <h2>Hallo ${record.customer_name},</h2>
        <p>Es tut uns leid, wir mussten Ihre Bestellung <strong>#${record.order_number}</strong> stornieren.</p>
      `
    }

    if (!subject) {
      console.log("ℹ️ [Email Function] No subject/content for status:", record.status)
      return new Response(JSON.stringify({ message: 'No template' }), { status: 200 })
    }

    console.log("📤 [Email Function] Sending email via Resend to:", record.customer_email)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Schawarma-Time <onboarding@resend.dev>', // Using Resend's default test sender if custom domain is not ready
        to: [record.customer_email],
        subject: subject,
        html: getBaseTemplate(content, subject),
      }),
    })

    const resData = await res.json()
    console.log(`✅ [Resend Response Status: ${res.status}]`, JSON.stringify(resData))
    
    if (!res.ok) {
      console.error("❌ [Resend Error Detail]:", JSON.stringify(resData))
      return new Response(JSON.stringify({ error: resData, step: 'resend_api' }), { status: 400 })
    }

    return new Response(JSON.stringify(resData), { status: 200 })

  } catch (error) {
    console.error("❌ [Email Function] Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

