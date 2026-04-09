# Smash47 — Web App Özellik Listesi

> Tek restoran için UberEats benzeri sipariş sistemi
> Dil: Almanca (DE)
> Versiyon: 1.0

---

## 📦 Tech Stack

| Katman | Teknoloji |
|---|---|
| Frontend | Vite + React 19 + TypeScript |
| Stil | Tailwind CSS + Framer Motion |
| State | Zustand (sepet yönetimi) |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Fotoğraf CDN | Cloudinary |
| Ödeme | Nakit / Kapıda Kart |
| Deploy | Netlify (Ücretsiz) |

---

## 🛍️ MÜŞTERİ TARAFI

### Menü & Ürünler
- [ ] Kategori bazlı menü listeleme (Burger, Beilage, Menü, İçecek, Sos...)
- [ ] Ürün kartları (fotoğraf, isim, açıklama, fiyat)
- [ ] "Most liked" / Öne çıkan ürün badge'i
- [ ] Ürün detay modalı (ekstralar, soslar, notlar)
- [ ] Özel not alanı (soğansız, ekstra sos vb.)
- [ ] Alerjen bilgisi (🥜🥛🌾 ikonları her üründe)
- [ ] Kalori bilgisi (ürün başına kcal)
- [ ] Vejetaryen / Vegan filtresi (🌱 badge + filtreleme)
- [ ] Helal sertifikası badge'i
- [ ] "Stokta yok" durumu gösterimi (pasif ürün)
- [ ] Menü içi arama
- [ ] "Bunu alanlar bunu da aldı" öneri sistemi
- [ ] Combo builder (kendi menünü kendin oluştur)

### Sepet & Sipariş
- [ ] Sepete ürün ekle / çıkar / miktar güncelle
- [ ] Sticky sağ sidebar sepet (desktop)
- [ ] Mobil alt bar sepet özeti
- [ ] Min. sipariş uyarısı
- [ ] Delivery fee hesaplama
- [ ] Sipariş özeti sayfası
- [ ] Sipariş onay sayfası (teşekkür ekranı)
- [ ] Tahmini teslimat süresi göstergesi ("35-45 dk")

### Ödeme
- [ ] Nakit (kapıda ödeme)
- [ ] Kapıda kart ile ödeme seçeneği
- [ ] Kurumsal müşteriler için PDF fatura

### Müşteri Hesabı
- [ ] Kayıt / Giriş (E-mail veya Google ile)
- [ ] Birden fazla adres kaydetme (ev, iş vb.)
- [ ] Sipariş geçmişi görüntüleme
- [ ] "Tekrar sipariş ver" butonu
- [ ] Favori ürünler (kalp ikonu ile kaydet)
- [ ] Profil yönetimi (isim, telefon, adres)

### Teslimat
- [ ] Google Maps entegrasyonu (adres otomatik tamamlama)
- [ ] Teslimat bölgesi haritası (hangi mahallelere teslimat yapılır)
- [ ] Mesafeye göre değişken delivery fee (0-3km €2, 3-6km €3,50 vb.)
- [ ] Bölgeye göre min. sipariş tutarı
- [ ] Sipariş takip sayfası (canlı durum: Hazırlanıyor / Yolda / Teslim)

### Kampanya & İndirimler
- [ ] İndirim kodu / kupon girişi
- [ ] İlk sipariş indirimi ("İlk siparişinde %10")
- [ ] Doğum günü indirimi (kayıtlı müşterilere otomatik)
- [ ] Puan sistemi / Loyalty (her €1 = 1 puan, 100 puan = €5 indirim)
- [ ] Kampanya banner'ı (anasayfada görünür alan)

### Bildirimler (Müşteri)
- [ ] E-mail sipariş onayı (sipariş detaylı)
- [ ] Push notification (PWA üzerinden tarayıcı bildirimi)

---

## 🔧 ADMİN PANELİ (Restaurant Sahibi)

### Giriş & Güvenlik
- [ ] Güvenli admin girişi (Supabase Auth)
- [ ] Çoklu admin rolü (Kasiyer, Mutfak, Müdür)
- [ ] Oturum yönetimi / logout

### Menü Yönetimi
- [ ] Ürün ekle / düzenle / sil
- [ ] Ürün fotoğrafı yükle (upload + crop + önizleme via Cloudinary)
- [ ] Kategori yönetimi (ekle, sil, sırala, isim değiştir)
- [ ] Ürün aktif / pasif toggle (geçici gizleme)
- [ ] Ekstra seçenekler yönetimi (sos, boyut, ekstra malzeme)
- [ ] Alerjen ve kalori bilgisi girişi
- [ ] Vejetaryen / Vegan / Helal etiket yönetimi

### Operasyon
- [ ] Teslimat (Lieferung) açma / kapama — tek tıkla
- [ ] Çalışma saatleri yönetimi (her gün için ayrı saat)
- [ ] Tatil / kapalı modu ("Bugün kapalıyız" mesajı + tarih seçimi)
- [ ] Özel kapalı tarih istisnası (ör. 24 Aralık 12:00-18:00)
- [ ] Otomatik kapanma (saat 22:00 olunca sistem otomatik kapansın)
- [ ] Min. sipariş tutarı güncelleme
- [ ] Delivery fee güncelleme
- [ ] Tahmini hazırlık süresi güncelleme (ör. 20-30 dk)
- [ ] Teslimat bölgesi haritası düzenleme

### Sipariş Yönetimi
- [ ] Canlı sipariş paneli (Supabase Realtime — anlık, refresh gerekmez)
- [ ] Sipariş durumu güncelleme (Bekliyor → Hazırlanıyor → Yolda → Teslim)
- [ ] Sesli bildirim (yeni sipariş gelince zil sesi)
- [ ] Sipariş reddetme (gerekçe ile iptal)
- [ ] Sipariş yazdırma (mutfak yazıcısı / receipt — tarayıcı print())
- [ ] Tablet modu (mutfak için büyük ekran sipariş görünümü)
- [ ] Sipariş geçmişi (tarih, tutar, ürünler)

### Kampanya & Pazarlama
- [ ] İndirim kodu oluşturma (% veya sabit tutar)
- [ ] Kampanya takvimi (ör. Pazartesi özel, hafta sonu menüsü)
- [ ] Hero banner / fotoğraf yönetimi (anasayfa görselini değiştir)
- [ ] Özel duyuru / popup yönetimi ("Bugün özel menü var")
- [ ] Loyalty puan sistemi yönetimi
- [ ] Email kampanyası (Mailchimp entegrasyonu)
- [ ] Müşteri yorumları görüntüleme ve yanıtlama

### Analitik & Raporlama
- [ ] Günlük / haftalık / aylık ciro grafiği
- [ ] En çok satan ürünler sıralaması
- [ ] Saate göre sipariş yoğunluğu haritası
- [ ] Sipariş sayısı (zaman bazlı)
- [ ] Ortalama sepet tutarı
- [ ] İptal edilen siparişler ve sebep analizi
- [ ] Popüler ürün haftalık trend kıyaslaması
- [ ] Müşteri segmentasyonu (yeni / tekrar eden / kayıp)
- [ ] Günlük gelir hedefi (hedef koy, progress bar ile takip et)
- [ ] Haftalık özet PDF raporu indirme
- [ ] Google Analytics entegrasyonu

---

## ⚙️ TEKNİK & ALTYAPI

### PWA & Performans
- [ ] PWA desteği (telefona uygulama gibi yüklenebilsin)
- [ ] Offline modu (menü önbelleğe alınsın)
- [ ] Lazy loading (görseller ve kategoriler)
- [ ] Lighthouse skoru 90+ hedefi

### SEO & Hukuki
- [ ] SEO optimizasyonu (meta tags, Open Graph)
- [ ] Google Schema markup ("Sipariş ver" butonu arama sonuçlarında)
- [ ] GDPR uyumlu Cookie banner
- [ ] Gizlilik Politikası / Datenschutz sayfası (DE)
- [ ] Kullanım Şartları / AGB sayfası (DE)
- [ ] Impressum sayfası (DE — Almanya yasal zorunluluğu)

### Erişilebilirlik
- [ ] Dark mode (sistem temasına göre otomatik)
- [ ] Erişilebilirlik / a11y (WCAG 2.1 uyumu, ekran okuyucu desteği)
- [ ] Mobil tam uyumluluk (responsive)

### Entegrasyonlar
- [ ] Google Maps API (adres doğrulama + teslimat bölgesi)
- [ ] Cloudinary (ürün fotoğrafları CDN)
- [ ] Supabase Realtime (canlı sipariş paneli)
- [ ] Mailchimp (email kampanyaları)
- [ ] Resend (sipariş e-mail bildirimleri)
- [ ] Google Analytics 4

---

## 🚫 KAPSAM DIŞI (Bu projede YOK)

- Çoklu dil (sadece Almanca / DE)
- Stripe entegrasyonu
- PayPal entegrasyonu
- Apple Pay / Google Pay
- Stok / malzeme yönetimi
- Referral (arkadaşını getir) sistemi
- WhatsApp bildirim (ücretli API)
- SMS bildirim (ücretli)

---

## 🗓️ GELİŞTİRME FAZLARI

### 🔴 Faz 1 — MVP (Temel Sistem)
- Menü görüntüleme, sepet, sipariş akışı
- Nakit / kapıda kart ödeme
- Admin: ürün CRUD, teslimat açma/kapama, canlı sipariş paneli
- Temel bildirimler (e-mail onayı)

### 🟡 Faz 2 — Kullanıcı Deneyimi
- Müşteri hesabı (kayıt, giriş, adres, geçmiş)
- Push notification
- İndirim kodu, ilk sipariş kampanyası
- Sipariş takip sayfası
- Alerjen, kalori, vegan/helal bilgileri

### 🟢 Faz 3 — Büyüme & Pazarlama
- Loyalty puan sistemi
- Gelişmiş analitik & PDF rapor
- Email kampanyası (Mailchimp)
- Combo builder, öneri sistemi
- Yazıcı entegrasyonu (tarayıcı print)
- SEO schema markup

---

*Son güncelleme: 2026-04-07*
