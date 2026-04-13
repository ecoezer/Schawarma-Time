# Schawarma-Time — Kurulum Kılavuzu

> Sıfırdan tam çalışan bir kurulum için gereken her adım. Teknik bilgi varsayımı yapılmamıştır.

---

## İçindekiler

1. [Gereksinimler](#1-gereksinimler)
2. [Kodu İndirme](#2-kodu-indirme)
3. [Supabase — Veritabanı Kurulumu](#3-supabase--veritabanı-kurulumu)
4. [Cloudinary — Görsel Yükleme](#4-cloudinary--görsel-yükleme)
5. [Resend — E-posta Kurulumu](#5-resend--e-posta-kurulumu)
6. [DNS Ayarları](#6-dns-ayarları)
7. [Frontend .env Dosyası](#7-frontend-env-dosyası)
8. [Yerel Geliştirme](#8-yerel-geliştirme)
9. [Supabase Edge Function](#9-supabase-edge-function)
10. [Netlify — Canlı Yayın](#10-netlify--canlı-yayın)
11. [Admin Kullanıcı Oluşturma](#11-admin-kullanıcı-oluşturma)
12. [Son Kontrol Listesi](#12-son-kontrol-listesi)
13. [Sorun Giderme](#13-sorun-giderme)

---

## 1. Gereksinimler

Bilgisayarınızda şunların kurulu olması gerekir:

### Node.js (v18 veya üzeri)
1. https://nodejs.org adresine gidin
2. "LTS" sürümünü indirin ve kurun
3. Kurulum sonrası terminali açın ve kontrol edin:
```bash
node --version    # v18.x.x veya üzeri çıkmalı
npm --version     # 9.x.x veya üzeri çıkmalı
```

### Git
1. https://git-scm.com adresine gidin ve kurun
2. Kontrol:
```bash
git --version
```

### Supabase CLI
```bash
npm install -g supabase
supabase --version
```

---

## 2. Kodu İndirme

```bash
# Projeyi klonlayın
git clone https://github.com/ecoezer/Schawarma-Time.git
cd Schawarma-Time/schawarma-time-app

# Bağımlılıkları yükleyin
npm install
```

---

## 3. Supabase — Veritabanı Kurulumu

### 3.1 Supabase Hesabı Açma
1. https://supabase.com adresine gidin
2. **"Start your project"** → GitHub hesabınızla giriş yapın

### 3.2 Yeni Proje Oluşturma
1. **"New project"** butonuna tıklayın
2. Ayarlar:
   - **Name:** `schawarma-time`
   - **Database Password:** Güçlü bir şifre girin — **BU ŞİFREYİ KAYDEDIN!**
   - **Region:** `Frankfurt (eu-central-1)` — GDPR uyumu için
   - **Pricing Plan:** Free tier
3. **"Create new project"** → 1-2 dakika bekleyin

### 3.3 API Bilgilerini Alma
1. Sol menü → **"Project Settings"** → **"API"**
2. Not edin:
   - **Project URL:** `https://XXXXXXXXXXXX.supabase.co`
   - **anon / public key:** `eyJhbG...` ile başlayan string

> ⚠️ `service_role` key'ini asla frontend koduna eklemeyin!

### 3.4 Veritabanı Şemasını Yükleme

1. Sol menü → **"SQL Editor"** → **"New query"**
2. `supabase/schema.sql` dosyasının tüm içeriğini kopyalayıp yapıştırın
3. **"Run"** butonuna tıklayın
4. Alt kısımda **"Success. No rows returned"** mesajı çıkmalı

Bu adım tek başına şunları oluşturur:
- Tüm tablolar (9 adet)
- RLS güvenlik politikaları
- Trigger fonksiyonları
- View'lar ve RPC fonksiyonları
- Başlangıç restoran ayarları (Schawarma-Time, Hildesheim)
- Demo kuponlar (`SMASH10`, `WILLKOMMEN`)

### 3.5 Ürün Verilerini Yükleme

1. Yeni bir SQL query açın (**"New query"**)
2. `supabase/seed.sql` dosyasının içeriğini kopyalayıp yapıştırın
3. **"Run"** butonuna tıklayın
4. Table Editor'de `products` tablosunda 44 ürün görünmeli

### 3.6 Auth Ayarları

1. Sol menü → **"Authentication"** → **"Settings"**
2. **"Site URL"** alanına:
   ```
   https://schawarma-time.netlify.app
   ```
3. **"Redirect URLs"** bölümüne şunları ekleyin:
   ```
   https://schawarma-time.netlify.app/**
   http://localhost:5173/**
   http://localhost:5174/**
   ```
4. **"Save"** butonuna tıklayın

---

## 4. Cloudinary — Görsel Yükleme

### 4.1 Hesap Açma
1. https://cloudinary.com → **"Sign up for free"**
2. Dashboard'a giriş yapın

### 4.2 Cloud Name'i Öğrenme
- Dashboard sağ üstte **Cloud Name** yazar (örn: `dxukcriw6`)
- Not edin — `.env` dosyasında kullanacaksınız

### 4.3 Upload Preset Oluşturma
1. Sol menü → **"Settings"** (çark ikonu) → **"Upload"** sekmesi
2. Aşağı kaydırın → **"Upload presets"** → **"Add upload preset"**
3. Ayarlar:
   - **Preset name:** `schawarma-time_speisekarte` ← tam bu ismi girin
   - **Signing mode:** `Unsigned` ← önemli!
4. **"Save"**

---

## 5. Resend — E-posta Kurulumu

> Bu adım opsiyoneldir. Atlanırsa sipariş onay e-postaları gönderilmez, diğer her şey çalışır.

### 5.1 Hesap Açma
1. https://resend.com → **"Sign Up"**
2. Email ve şifre ile kayıt olun

### 5.2 API Key Oluşturma
1. Sol menü → **"API Keys"** → **"Create API Key"**
2. **Name:** `schawarma-time-production`
3. **Permission:** `Full access`
4. Oluşturulan key'i kopyalayın: `re_XXXXXXXXXXXX` — **bir daha görmezsiniz, saklayın!**

### 5.3 Domain Ekleme
1. Sol menü → **"Domains"** → **"Add Domain"**
2. Domain adınızı girin (örn: `schawarma-time.de`)
3. Size DKIM ve SPF DNS kayıtları verilecek → bkz. [Bölüm 6](#6-dns-ayarları)

---

## 6. DNS Ayarları

> Domain sağlayıcınızda (IONOS, GoDaddy vb.) yapılır. DNS yayılması 15-60 dakika sürebilir.

Resend'in verdiği DNS kayıtlarını domain sağlayıcınıza ekleyin:

| Tip | Host | Değer |
|-----|------|-------|
| TXT | `resend._domainkey` | Resend'in verdiği DKIM değeri |
| TXT | `@` | `v=spf1 include:amazonses.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine;` |

Ekledikten sonra Resend Dashboard'da **"Verify"** butonuna tıklayın.

---

## 7. Frontend .env Dosyası

```bash
cd schawarma-time-app
cp .env.example .env
```

`.env` dosyasını açın ve doldurun:

```env
VITE_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_CLOUDINARY_CLOUD_NAME=sizin-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=schawarma-time_speisekarte
```

> ⚠️ `.env` dosyası `.gitignore`'da zaten var — Git'e gönderilmez.

---

## 8. Yerel Geliştirme

```bash
cd schawarma-time-app

# Geliştirme sunucusunu başlat
npm run dev
# → http://localhost:5173 adresinde açılır

# TypeScript kontrol + production build
npm run build
# → dist/ klasörü oluşur

# Lint kontrolü
npm run lint
```

Çalışıp çalışmadığını test edin:
- Ana sayfa açılıyor mu?
- Ürünler görünüyor mu?
- `/register` ve `/login` çalışıyor mu?

---

## 9. Supabase Edge Function

> Bu adım sipariş onay e-postalarını aktif eder. Resend API key gereklidir.

### 9.1 Supabase CLI ile Giriş

```bash
supabase login
# Tarayıcıda Supabase hesabınıza giriş yapın
```

### 9.2 Proje ID'sini Bulun

Supabase Dashboard → **"Project Settings"** → **"General"** → **"Reference ID"**  
Örnek: `bhwzlbrwiayllslwsnra`

### 9.3 Secrets Ekleyin

```bash
supabase secrets set RESEND_API_KEY=re_XXXXXXXXXXXX \
  --project-ref PROJE_ID_NIZI

supabase secrets set RESEND_DOMAIN_VERIFIED=true \
  --project-ref PROJE_ID_NIZI

supabase secrets set WEBHOOK_SECRET=guclu-rastgele-bir-sifre \
  --project-ref PROJE_ID_NIZI
```

> `WEBHOOK_SECRET` için güçlü rastgele bir değer üretin:
> ```bash
> openssl rand -hex 32
> ```

### 9.4 Function'ı Deploy Edin

```bash
supabase functions deploy send-order-confirmation \
  --project-ref PROJE_ID_NIZI
```

### 9.5 Webhook Oluşturma

Supabase Dashboard → **"Database"** → **"Webhooks"** → **"Create a new hook"**

Ayarlar:
- **Name:** `order-status-email`
- **Table:** `orders`
- **Events:** `UPDATE` (sadece)
- **Type:** Supabase Edge Functions
- **Function:** `send-order-confirmation`
- **HTTP Headers:**
  - Key: `x-webhook-secret`
  - Value: yukarıda belirlediğiniz `WEBHOOK_SECRET` değeri

**"Create webhook"** butonuna tıklayın.

---

## 10. Netlify — Canlı Yayın

### 10.1 Netlify Hesabı Açma
1. https://netlify.com → **"Sign up"** → GitHub ile giriş

### 10.2 Siteyi Bağlama
1. **"Add new site"** → **"Import an existing project"**
2. **"GitHub"** seçin → Repository'nizi seçin (`Schawarma-Time`)
3. Build ayarları:
   - **Base directory:** `schawarma-time-app`
   - **Build command:** `npm run build`
   - **Publish directory:** `schawarma-time-app/dist`
4. **"Deploy site"** butonuna tıklayın

### 10.3 Ortam Değişkenlerini Ekleme
1. **"Site settings"** → **"Environment variables"**
2. Şunları ekleyin:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://XXXX.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` |
| `VITE_CLOUDINARY_CLOUD_NAME` | cloud adınız |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `schawarma-time_speisekarte` |

3. **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**

### 10.4 Deploy Sonrası

- Netlify size bir URL verir: `https://schawarma-time.netlify.app`
- Supabase Auth ayarlarındaki Site URL'ini bu adresle güncelleyin (bkz. [Bölüm 3.6](#36-auth-ayarları))

---

## 11. Admin Kullanıcı Oluşturma

### 11.1 Kayıt Olun
1. Uygulamada `/register` sayfasına gidin
2. Normal bir kullanıcı gibi kayıt olun (admin e-posta adresinizi kullanın)

### 11.2 Rolü Manager Yapın
1. Supabase Dashboard → **"Table Editor"** → `profiles` tablosu
2. Az önce kayıt olan kullanıcıyı bulun
3. Satıra tıklayın → **"Edit row"**
4. `role` alanını `customer` → `manager` olarak değiştirin
5. **"Save"**

### 11.3 Test Edin
1. Uygulamada giriş yapın
2. Otomatik olarak `/admin` sayfasına yönlendirilmelisiniz

---

## 12. Son Kontrol Listesi

### Altyapı
- [ ] Node.js v18+ kurulu: `node --version`
- [ ] `npm install` schawarma-time-app/ içinde tamamlandı
- [ ] `.env` dosyası oluşturuldu ve 4 değişken dolduruldu

### Supabase
- [ ] `schema.sql` SQL Editor'de başarıyla çalıştı
- [ ] `seed.sql` çalıştı — `products` tablosunda 44 ürün var
- [ ] Auth → Site URL ve Redirect URL'ler eklendi
- [ ] `profiles` tablosunda bir kullanıcının rolü `manager` yapıldı

### Cloudinary
- [ ] Cloudinary hesabı açıldı
- [ ] Upload preset `schawarma-time_speisekarte` oluşturuldu (Unsigned)

### Yerel Test
- [ ] `npm run dev` çalışıyor → localhost:5173 açılıyor
- [ ] Ana sayfa ve ürünler görünüyor
- [ ] `/login` ve `/register` çalışıyor
- [ ] Admin paneli `/admin` açılıyor
- [ ] `npm run build` hatasız tamamlanıyor

### Netlify
- [ ] GitHub repository Netlify'a bağlandı
- [ ] Build ayarları doğru (base: `schawarma-time-app`, publish: `schawarma-time-app/dist`)
- [ ] 4 ortam değişkeni Netlify'a eklendi
- [ ] Deploy başarılı — canlı site açılıyor

### E-posta (Opsiyonel)
- [ ] Resend hesabı açıldı, API key alındı
- [ ] DNS kayıtları domain sağlayıcıya eklendi
- [ ] Domain Resend'de doğrulandı (yeşil tik)
- [ ] Edge function deploy edildi
- [ ] Webhook oluşturuldu (`orders` → UPDATE → `send-order-confirmation`)

---

## 13. Sorun Giderme

### Hata: "relation does not exist"
→ `schema.sql` eksik veya hatalı çalışmış. SQL Editor'de tekrar çalıştırın.

### Hata: "new row violates row-level security policy"
→ RLS politikaları aktif. Kullanıcı giriş yapmadan sipariş veremez. Normal.

### Ürünler görünmüyor
→ `seed.sql` çalıştırıldı mı? Table Editor → `products` tablosunda satır var mı?

### Admin paneline girilemiyor
→ `profiles` tablosunda kullanıcının `role` alanı `manager` mi?

### E-postalar gelmiyor
→ Edge function deploy edildi mi? Webhook doğru mu kuruldu? Resend'de domain doğrulandı mı?

### Build hatası: "VITE_ env var missing"
→ `.env` dosyası `schawarma-time-app/` içinde mi? 4 değişken var mı?

### Netlify build başarısız
→ Base directory `schawarma-time-app` olarak ayarlı mı? Ortam değişkenleri Netlify'a eklendi mi?
