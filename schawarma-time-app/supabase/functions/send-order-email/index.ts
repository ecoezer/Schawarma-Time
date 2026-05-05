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

Deno.serve(async (req) => {
  try {
    const payload: OrderPayload = await req.json()
    const { record, old_record, type } = payload

    // Sadece UPDATE durumunda ve status değiştiğinde çalış
    if (type !== 'UPDATE' || !record.customer_email) {
      return new Response(JSON.stringify({ message: 'Skipped' }), { status: 200 })
    }

    if (record.status === old_record?.status) {
      return new Response(JSON.stringify({ message: 'Status unchanged' }), { status: 200 })
    }

    let subject = ''
    let html = ''

    if (record.status === 'confirmed') {
      subject = `Siparişin Onaylandı! - ${record.order_number}`
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #06c167;">Merhaba ${record.customer_name},</h2>
          <p>Güzel haber! <b>${record.order_number}</b> numaralı siparişin restoran tarafından onaylandı ve hazırlanmaya başlandı.</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin: 20px 0;">
            <p><b>Toplam Tutar:</b> €${record.total.toFixed(2)}</p>
            <p><b>Ödeme Yöntemi:</b> ${record.payment_method === 'cash' ? 'Kapıda Nakit' : 'Kapıda Kart'}</p>
          </div>
          <p>Afiyet olsun! <br/> Schawarma-Time Ekibi</p>
        </div>
      `
    } else if (record.status === 'cancelled') {
      subject = `Siparişin Hakkında Bilgilendirme - ${record.order_number}`
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Merhaba ${record.customer_name},</h2>
          <p>Üzgünüz, <b>${record.order_number}</b> numaralı siparişin şu anki yoğunluk veya teknik bir nedenden dolayı iptal edildi.</p>
          <p>Eğer bir hata olduğunu düşünüyorsan lütfen bizimle iletişime geç.</p>
          <p>Saygılarımızla, <br/> Schawarma-Time Ekibi</p>
        </div>
      `
    } else if (record.status === 'on_the_way') {
      subject = `Siparişin Yola Çıktı! 🛵 - ${record.order_number}`
      html = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #142328;">Siparişin Yolda!</h2>
          <p>Harika! <b>${record.order_number}</b> numaralı siparişin kuryemize teslim edildi. Çok yakında kapında olacak.</p>
          <p>Lütfen telefonunu yakınında tut!</p>
          <p>Afiyet olsun! <br/> Schawarma-Time Ekibi</p>
        </div>
      `
    }

    if (!subject) {
      return new Response(JSON.stringify({ message: 'No email needed for this status' }), { status: 200 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Schawarma-Time <onboarding@resend.dev>', // Doğrulanmış domain yoksa bunu kullanırız
        to: [record.customer_email],
        subject: subject,
        html: html,
      }),
    })

    const resData = await res.json()
    return new Response(JSON.stringify(resData), { status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
