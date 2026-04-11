# Smash47 — Kurulum Kılavuzu

> Bu kılavuz, Smash47 sipariş sistemini sıfırdan kurmak için gereken her adımı, her hesap açma işlemini ve her ayarı detaylı olarak açıklar. Hiçbir teknik bilgi varsayımı yapılmamıştır.

---

## İçindekiler

1. [Gereksinimler](#1-gereksinimler)
2. [GitHub — Hesap & Repository](#2-github--hesap--repository)
3. [Supabase — Hesap & Proje Kurulumu](#3-supabase--hesap--proje-kurulumu)
4. [Veritabanı Şemasını Yükleme](#4-veritabanı-şemasını-yükleme)
5. [Supabase Auth Ayarları](#5-supabase-auth-ayarları)
6. [Admin Kullanıcı Oluşturma](#6-admin-kullanıcı-oluşturma)
7. [Cloudinary — Hesap & Ayarlar](#7-cloudinary--hesap--ayarlar)
8. [Resend — Hesap & Domain Kurulumu](#8-resend--hesap--domain-kurulumu)
9. [DNS Ayarları (IONOS / Domain Sağlayıcı)](#9-dns-ayarları-ionos--domain-sağlayıcı)
10. [Supabase Edge Function Kurulumu](#10-supabase-edge-function-kurulumu)
11. [Supabase Webhook Kurulumu](#11-supabase-webhook-kurulumu)
12. [Frontend .env Dosyası](#12-frontend-env-dosyası)
13. [Netlify — Hosting & Deploy](#13-netlify--hosting--deploy)
14. [Netlify Ortam Değişkenleri](#14-netlify-ortam-değişkenleri)
15. [Son Kontroller](#15-son-kontroller)
16. [Sorun Giderme](#16-sorun-giderme)

---

## 1. Gereksinimler

Başlamadan önce bilgisayarınızda şunların kurulu olması gerekir:

### Node.js (v18 veya üzeri)
1. https://nodejs.org adresine gidin
2. "LTS" sürümünü indirin ve kurun
3. Kurulum sonrası terminali açın ve kontrol edin:
   ```bash
   node --version    # v18.x.x veya üzeri çıkmalı
   npm --version     # 9.x.x veya üzeri çıkmalı
   ```

### Git
1. https://git-scm.com adresine gidin
2. İşletim sisteminize uygun versiyonu indirin ve kurun
3. Kontrol:
   ```bash
   git --version
   ```

### Supabase CLI
```bash
npm install -g supabase
supabase --version    # Çıktı veriyorsa kuruldu
```

---

## 2. GitHub — Hesap & Repository

### 2.1 GitHub Hesabı Açma
1. https://github.com adresine gidin
2. "Sign up" butonuna tıklayın
3. Email, kullanıcı adı ve şifre girin
4. Email doğrulamasını tamamlayın

### 2.2 Repository Oluşturma
1. GitHub'a giriş yapın
2. Sağ üstteki **"+"** ikonuna tıklayın → **"New repository"**
3. Ayarlar:
   - **Repository name:** `smash47-app` (istediğiniz bir isim)
   - **Visibility:** `Private` (önerilir)
   - "Add a README file" kutusunu **işaretlemeyin**
4. **"Create repository"** butonuna tıklayın

### 2.3 Kodu Bilgisayarınıza İndirme ve Bağlama
```bash
# Projeyi klonlayın (veya ZIP olarak indirin)
git clone https://github.com/ecoezer/Smash47.git
cd Smash47

# Kendi repository'nize bağlayın
git remote set-url origin https://github.com/KULLANICI_ADINIZ/smash47-app.git
git push -u origin main
```

---

## 3. Supabase — Hesap & Proje Kurulumu

### 3.1 Supabase Hesabı Açma
1. https://supabase.com adresine gidin
2. **"Start your project"** butonuna tıklayın
3. **"Continue with GitHub"** ile GitHub hesabınızla giriş yapın (önerilir)
4. Email doğrulamasını tamamlayın

### 3.2 Yeni Proje Oluşturma
1. Supabase Dashboard'da **"New project"** butonuna tıklayın
2. Ayarlar:
   - **Organization:** Mevcut organizasyonunuzu seçin (veya yeni oluşturun)
   - **Name:** `smash47` (istediğiniz bir isim)
   - **Database Password:** Güçlü bir şifre girin — **BU ŞİFREYİ KAYDEDIN!**
   - **Region:** `Frankfurt (eu-central-1)` — GDPR uyumu için Avrupa bölgesi
   - **Pricing Plan:** Free tier seçin
3. **"Create new project"** butonuna tıklayın
4. Proje oluşturulması 1-2 dakika sürer, bekleyin

### 3.3 Proje Bilgilerini Alma
Proje oluşturulduktan sonra:
1. Sol menüden **"Project Settings"** → **"API"** sayfasına gidin
2. Şu bilgileri not edin:
   - **Project URL:** `https://XXXXXXXXXXXX.supabase.co`
   - **anon / public key:** `eyJhbG...` ile başlayan uzun string
   
> ⚠️ `service_role` key'i hiçbir zaman frontend koduna eklemeyin!

---

## 4. Veritabanı Şemasını Yükleme

### 4.1 SQL Editor'ü Açma
1. Supabase Dashboard sol menüsünden **"SQL Editor"** ikonuna tıklayın
2. **"New query"** butonuna tıklayın

### 4.2 Ana Şemayı Yükleme
1. Proje klasöründeki `supabase_schema.sql` dosyasını bir metin editöründe açın (VS Code, Notepad++ vb.)
2. Tüm içeriği kopyalayın (Ctrl+A, Ctrl+C)
3. Supabase SQL Editor'e yapıştırın
4. **"Run"** butonuna tıklayın (veya Ctrl+Enter)
5. Altta "Success. No rows returned" mesajı çıkmalı

### 4.3 Güvenlik & RPC Fonksiyonlarını Yükleme
1. Yeni bir SQL query açın (**"New query"**)
2. `security_fixes_v3.sql` dosyasının içeriğini kopyalayıp yapıştırın
3. **"Run"** butonuna tıklayın
4. Hata yoksa devam edin

### 4.4 Tabloları Kontrol Etme
1. Sol menüden **"Table Editor"** ikonuna tıklayın
2. Şu tabloların oluştuğunu doğrulayın:
   - `categories`
   - `products`
   - `profiles`
   - `orders`
   - `coupons`
   - `restaurant_settings`

### 4.5 Restoran Ayarlarını Doldurma
1. **"Table Editor"** → `restaurant_settings` tablosuna tıklayın
2. **"Insert row"** butonuna tıklayın
3. Şu alanları doldurun:
   ```
   name: "Restoran Adınız"
   description: "Kısa açıklama"
   address: "Tam adres"
   phone: "+49 5121 000000"
   email: "info@restoraniniz.de"
   is_delivery_active: true
   delivery_fee: 2.00
   min_order_amount: 12.00
   estimated_delivery_time: 35
   hours: {
     "monday": {"open": "11:30", "close": "22:00", "is_closed": false},
     "tuesday": {"open": "11:30", "close": "22:00", "is_closed": false},
     "wednesday": {"open": "11:30", "close": "22:00", "is_closed": false},
     "thursday": {"open": "11:30", "close": "22:00", "is_closed": false},
     "friday": {"open": "11:30", "close": "23:00", "is_closed": false},
     "saturday": {"open": "11:30", "close": "23:00", "is_closed": false},
     "sunday": {"open": "11:30", "close": "22:00", "is_closed": false}
   }
   ```
4. **"Save"** butonuna tıklayın

---

## 5. Supabase Auth Ayarları

### 5.1 Email Ayarları
1. Sol menüden **"Authentication"** → **"Providers"** sayfasına gidin
2. **"Email"** sağlayıcısının açık olduğunu doğrulayın

### 5.2 Email Doğrulama Ayarı
1. **"Authentication"** → **"Settings"** sayfasına gidin
2. **"Email Auth"** bölümünde:
   - **"Confirm email"** seçeneğini kapatabilirsiniz (geliştirme için kolaylık sağlar)
   - Üretim ortamı için açık bırakın

### 5.3 Site URL Ayarı
1. **"Authentication"** → **"Settings"** sayfasına gidin
2. **"Site URL"** alanına Netlify deploy URL'inizi girin:
   ```
   https://smash47.netlify.app
   ```
   (Henüz Netlify kurulmadıysa şimdilik boş bırakın, sonra güncelleyin)

### 5.4 Redirect URL'leri Ekleme
1. Aynı sayfada **"Redirect URLs"** bölümünü bulun
2. Şunları ekleyin:
   ```
   https://smash47.netlify.app/**
   http://localhost:5173/**
   http://localhost:5174/**
   ```

---

## 6. Admin Kullanıcı Oluşturma

### 6.1 Kullanıcı Kaydı
1. Uygulamanızı çalıştırın (kurulum bittikten sonra)
2. `/register` sayfasında normal bir kullanıcı gibi kaydolun
3. Admin olacak email adresinizi kullanın

### 6.2 Rolü Manager Yapma
1. Supabase Dashboard → **"Table Editor"** → `profiles` tablosuna gidin
2. Az önce kaydolan kullanıcıyı bulun (email ile arayın)
3. Satırın üzerine tıklayın → **"Edit row"**
4. `role` alanını `customer`'dan `manager`'a değiştirin
5. **"Save"** butonuna tıklayın

### 6.3 Giriş Testi
1. Uygulamada giriş yapın
2. Otomatik olarak `/admin` sayfasına yönlendirilmeli

---

## 7. Cloudinary — Hesap & Ayarlar

### 7.1 Cloudinary Hesabı Açma
1. https://cloudinary.com adresine gidin
2. **"Sign up for free"** butonuna tıklayın
3. Ad, email, şifre girin
4. Email doğrulamasını tamamlayın
5. Dashboard'a giriş yapın

### 7.2 Cloud Name'i Öğrenme
1. Dashboard'un sağ üstünde **cloud name**'inizi görebilirsiniz
2. Örnek: `dxukcriw6`
3. Bu değeri not edin — `.env` dosyasında kullanacaksınız

### 7.3 Upload Preset Oluşturma
1. Sol menüden **"Settings"** (çark ikonu) → **"Upload"** sekmesine gidin
2. Aşağı kaydırın, **"Upload presets"** bölümünü bulun
3. **"Add upload preset"** butonuna tıklayın
4. Ayarlar:
   - **Preset name:** `smash47_speisekarte` (tam bu ismi girin)
   - **Signing mode:** `Unsigned` — önemli! Aksi halde frontend upload çalışmaz
   - **Folder:** `smash47` (opsiyonel, görselleri gruplayar)
5. **"Save"** butonuna tıklayın

> ⚠️ Upload preset adını farklı yazdıysanız `.env` dosyasında `VITE_CLOUDINARY_UPLOAD_PRESET` değerini güncellemeyi unutmayın.

---

## 8. Resend — Hesap & Domain Kurulumu

### 8.1 Resend Hesabı Açma
1. https://resend.com adresine gidin
2. **"Sign Up"** butonuna tıklayın
3. Email ve şifre ile kayıt olun
4. Email doğrulamasını tamamlayın

### 8.2 API Anahtarı Oluşturma
1. Resend Dashboard sol menüsünden **"API Keys"** sayfasına gidin
2. **"Create API Key"** butonuna tıklayın
3. Ayarlar:
   - **Name:** `smash47-production`
   - **Permission:** `Full access`
   - **Domain:** `All domains` veya domaininizi seçin
4. **"Add"** butonuna tıklayın
5. Oluşturulan anahtarı **HEMEN KOPYALAYIN** — bir daha gösterilmez!
   - Format: `re_XXXXXXXXXXXX`
6. Bu anahtarı not edin — Supabase secret olarak eklenecek

### 8.3 Domain Ekleme
1. Resend Dashboard sol menüsünden **"Domains"** sayfasına gidin
2. **"Add Domain"** butonuna tıklayın
3. Domain adınızı girin: `smash47.de` (kendi domain'iniz)
4. **Region:** `EU (Frankfurt)` seçin (GDPR için)
5. **"Add"** butonuna tıklayın
6. Resend size DNS kayıtları gösterecek — bunları bir sonraki adımda ekleyeceksiniz

### 8.4 DNS Kayıtlarını Not Alma
Resend size şöyle kayıtlar gösterecek (değerler sizin domain'inize özel olacak):

```
TXT   send._domainkey.smash47.de   p=MIGfMA0GCSqGSIb3DQEBAQUA...
TXT   resend._domainkey.smash47.de v=DKIM1; p=MIGfMA...
MX    smash47.de                   feedback-smtp.eu-west-1.amazonses.com
TXT   smash47.de                   v=spf1 include:amazonses.com ~all
```

Bu değerleri sayfada açık bırakın, bir sonraki adımda DNS paneline gireceksiniz.

---

## 9. DNS Ayarları (IONOS / Domain Sağlayıcı)

> Bu adım IONOS kullananlar için yazılmıştır. Başka bir sağlayıcı kullanıyorsanız arayüz farklı olabilir ancak eklenecek kayıtlar aynıdır.

### 9.1 IONOS'a Giriş
1. https://www.ionos.de adresine gidin
2. Hesabınıza giriş yapın
3. **"Domains & SSL"** bölümüne gidin
4. Domain adınızı bulun ve **"DNS"** sekmesine tıklayın

### 9.2 Resend DKIM Kayıtlarını Ekleme
Resend'in gösterdiği her TXT kaydı için:
1. **"Record hinzufügen"** (Kayıt ekle) butonuna tıklayın
2. **Type:** TXT
3. **Hostname:** `send._domainkey` (sadece subdomain kısmını girin, domain kendisi otomatik eklenir)
4. **Value:** Resend'in gösterdiği değerin tamamı
5. **TTL:** 1 Stunde (1 saat)
6. **"Speichern"** (Kaydet) butonuna tıklayın

Her kayıt için tekrarlayın.

### 9.3 SPF Kaydını Güncelleme
Mevcut SPF kaydınız varsa güncelleyin, yoksa yeni ekleyin:
1. **Type:** TXT (veya SPF)
2. **Hostname:** `@`
3. **Value:**
   ```
   v=spf1 include:_spf-eu.ionos.com include:amazonses.com ~all
   ```
   > Not: `_spf-eu.ionos.com` IONOS email kullanıyorsanız kalır. Kullanmıyorsanız kaldırabilirsiniz.
4. Kaydedin

### 9.4 DMARC Kaydı Ekleme
1. **"Record hinzufügen"** butonuna tıklayın
2. **Type:** TXT
3. **Hostname:** `_dmarc`
4. **Value:**
   ```
   v=DMARC1; p=quarantine; rua=mailto:info@restoraniniz.de
   ```
5. Kaydedin

### 9.5 DNS Yayılmasını Bekleme
DNS değişiklikleri yayılması **15 dakika ile 24 saat** arasında sürebilir. Genellikle 30-60 dakika içinde tamamlanır.

### 9.6 Resend'de Domain Doğrulama
1. Resend Dashboard → **"Domains"** sayfasına gidin
2. Domain'inizin yanındaki **"Verify"** butonuna tıklayın
3. Tüm kayıtlar yeşil ✓ gösterince domain doğrulanmış demektir
4. Status **"Verified"** olana kadar beklemeniz gerekebilir

---

## 10. Supabase Edge Function Kurulumu

### 10.1 Supabase CLI ile Giriş
```bash
supabase login
```
Bu komut tarayıcıyı açar. Supabase hesabınıza giriş yapın ve izin verin.

### 10.2 Proje ID'sini Öğrenme
1. Supabase Dashboard → **"Project Settings"** → **"General"**
2. **"Reference ID"** kısmındaki değeri kopyalayın
   - Örnek: `bhwzlbrwiayllslwsnra`

### 10.3 Edge Function Secret'larını Ekleme

**Resend API Anahtarını Ekle:**
```bash
supabase secrets set RESEND_API_KEY=re_XXXXXXXXXXXX --project-ref PROJE_ID_NIZI
```

**Domain Doğrulama Değişkenini Ekle:**
```bash
# Domain doğrulandıktan SONRA:
supabase secrets set RESEND_DOMAIN_VERIFIED=true --project-ref PROJE_ID_NIZI

# Domain henüz doğrulanmadıysa:
supabase secrets set RESEND_DOMAIN_VERIFIED=false --project-ref PROJE_ID_NIZI
```

### 10.4 Edge Function'ı Deploy Etme
```bash
# Proje kök klasöründeyken:
supabase functions deploy send-order-confirmation --project-ref PROJE_ID_NIZI
```

Başarılı çıktı:
```
Deployed Functions on project PROJE_ID_NIZI: send-order-confirmation
```

### 10.5 Deploy'u Doğrulama
1. Supabase Dashboard → **"Edge Functions"** sayfasına gidin
2. `send-order-confirmation` fonksiyonunun listede göründüğünü doğrulayın

---

## 11. Supabase Webhook Kurulumu

Bu webhook, sipariş durumu değiştiğinde email gönderecek Edge Function'ı tetikler.

### 11.1 Webhook Oluşturma
1. Supabase Dashboard → **"Database"** → **"Webhooks"** sayfasına gidin
2. **"Create a new hook"** butonuna tıklayın

### 11.2 Webhook Ayarları
- **Name:** `order-status-email`
- **Table:** `orders`
- **Events:** Yalnızca **`UPDATE`** seçin (INSERT ve DELETE işaretlemeyin)
- **Type:** `Supabase Edge Functions`
- **Edge Function:** `send-order-confirmation` seçin
- **HTTP Method:** `POST`
- **Headers:** Boş bırakabilirsiniz

### 11.3 Webhook'u Kaydetme
**"Create webhook"** butonuna tıklayın.

> ✅ Artık bir sipariş `confirmed` veya `cancelled` durumuna geçtiğinde webhook tetiklenecek ve Edge Function email gönderecek.

---

## 12. Frontend .env Dosyası

### 12.1 .env Dosyası Oluşturma
`smash47-app/` klasörü içinde `.env` adlı dosya oluşturun:

```bash
cd smash47-app
cp .env.example .env    # Örnek dosyadan kopyala
```

Veya manuel olarak `smash47-app/.env` dosyası oluşturun ve şunları ekleyin:

```env
VITE_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_CLOUDINARY_CLOUD_NAME=sizin_cloud_name_iniz
VITE_CLOUDINARY_UPLOAD_PRESET=smash47_speisekarte
```

### 12.2 Değerleri Doldurma

| Değişken | Nereden Alınır |
|----------|----------------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard → sağ üst köşe |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary → Settings → Upload → Preset adı |

### 12.3 .env Dosyasını Git'e Eklememek
`.gitignore` dosyasında `.env` satırının olduğundan emin olun:
```
smash47-app/.env
```

> ⚠️ `.env` dosyasını hiçbir zaman GitHub'a pushlamamayın!

---

## 13. Netlify — Hosting & Deploy

### 13.1 Netlify Hesabı Açma
1. https://netlify.com adresine gidin
2. **"Sign up"** → **"Sign up with GitHub"** ile kayıt olun
3. GitHub hesabınıza erişim izni verin

### 13.2 Yeni Site Oluşturma
1. Netlify Dashboard'da **"Add new site"** → **"Import an existing project"** tıklayın
2. **"Deploy with GitHub"** seçin
3. GitHub repository'nizi bulun ve seçin (`smash47-app` veya ne isim verdiyseniz)
4. Erişim izni verin

### 13.3 Build Ayarları
Netlify aşağıdaki ayarları soracak:

| Alan | Değer |
|------|-------|
| **Base directory** | `smash47-app` |
| **Build command** | `npm run build` |
| **Publish directory** | `smash47-app/dist` |

> Not: `Base directory`'yi `smash47-app` olarak girmeniz kritik — aksi halde Netlify kök klasörden build almaya çalışır.

### 13.4 İlk Deploy
**"Deploy site"** butonuna tıklayın. İlk deploy birkaç dakika sürer.

### 13.5 Custom Domain Ekleme (opsiyonel)
1. Site deploy olduktan sonra **"Domain settings"** sayfasına gidin
2. **"Add custom domain"** butonuna tıklayın
3. Domain adınızı girin: `smash47.de`
4. Netlify size DNS kayıtları gösterecek — domain sağlayıcınızda bu kayıtları ekleyin
5. **SSL/TLS:** Netlify otomatik Let's Encrypt sertifikası ekler

---

## 14. Netlify Ortam Değişkenleri

### 14.1 Değişkenleri Ekleme
1. Netlify Dashboard → Sitenizi seçin → **"Site configuration"** → **"Environment variables"**
2. **"Add a variable"** butonuna tıklayın

### 14.2 Eklenecek Değişkenler
Her birini ayrı ayrı ekleyin:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://XXXXXXXXXXXX.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` (anon key) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name'iniz |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `smash47_speisekarte` |

### 14.3 Redeployment
Değişkenleri ekledikten sonra sitenin yeniden build edilmesi gerekir:
1. **"Deploys"** sekmesine gidin
2. **"Trigger deploy"** → **"Deploy site"** butonuna tıklayın

---

## 15. Son Kontroller

Kurulum tamamlandıktan sonra şunları test edin:

### 15.1 Temel Kontroller
- [ ] Ana sayfa açılıyor mu? (`https://sizin-site.netlify.app`)
- [ ] Ürünler listede görünüyor mu?
- [ ] Kategoriler çalışıyor mu?
- [ ] Ürün detay modali açılıyor mu?

### 15.2 Auth Kontrolleri
- [ ] `/register` sayfasında yeni kullanıcı kaydı yapılabiliyor mu?
- [ ] `/login` sayfasında giriş çalışıyor mu?
- [ ] Admin giriş yaptığında `/admin` sayfasına yönlendiriliyor mu?

### 15.3 Admin Panel Kontrolleri
- [ ] Dashboard KPI'ları görünüyor mu?
- [ ] Menü yönetimi açılıyor mu?
- [ ] Ürün ekleme/düzenleme çalışıyor mu?
- [ ] Cloudinary'e görsel yükleniyor mu?
- [ ] Restoran ayarları kaydediliyor mu?

### 15.4 Sipariş Akışı Kontrolleri
- [ ] Sepete ürün eklenebiliyor mu?
- [ ] Checkout sayfası açılıyor mu?
- [ ] Sipariş verilebiliyor mu?
- [ ] Admin panelde sipariş görünüyor mu?
- [ ] Admin onayladığında müşteri ekranı güncelleniyor mu?

### 15.5 Email Kontrolleri
- [ ] Admin "Confirm" dediğinde email geliyor mu?
- [ ] Admin "Stornieren" dediğinde red emaili geliyor mu?
- [ ] Email spam klasörüne gidiyor mu? (DNS ayarlarını kontrol edin)
- [ ] Email doğru gönderen adresini gösteriyor mu? (`bestellung@smash47.de`)

### 15.6 Supabase Realtime Kontrolü
- [ ] İki farklı tarayıcıda: biri admin, biri müşteri açın
- [ ] Müşteri sipariş versin
- [ ] Admin panelde anlık görünüyor mu?
- [ ] Admin onaylasın — müşteri ekranı otomatik güncellensin mi?

---

## 16. Sorun Giderme

### "Email gelmiyor" sorunu
1. Resend Dashboard → **"Logs"** sayfasını kontrol edin
2. Edge Function loglarını kontrol edin:
   - Supabase → **"Edge Functions"** → `send-order-confirmation` → **"Logs"**
3. Webhook'un `UPDATE` eventine ayarlı olduğunu doğrulayın
4. `RESEND_DOMAIN_VERIFIED` secret'ının `true` olduğunu kontrol edin:
   ```bash
   supabase secrets list --project-ref PROJE_ID_NIZI
   ```
5. DNS kayıtlarının yayıldığını doğrulayın:
   ```bash
   dig TXT smash47.de +short
   dig TXT _dmarc.smash47.de +short
   ```

### "Email spam'e gidiyor" sorunu
1. SPF kaydını kontrol edin — `amazonses.com` dahil mi?
2. DMARC kaydını kontrol edin — `_dmarc` subdomain'inde mi?
3. Resend Domain sayfasında tüm kayıtlar yeşil ✓ mi?
4. DNS değişiklikleri henüz yayılmamış olabilir, 1 saat bekleyin

### "Sipariş verilemez" sorunu
1. Supabase → SQL Editor'de şunu çalıştırın:
   ```sql
   SELECT * FROM restaurant_settings LIMIT 1;
   ```
   `is_delivery_active = true` olduğunu doğrulayın
2. Çalışma saatlerini kontrol edin — restoran o an açık mı?
3. Minimum sipariş tutarına ulaşıldı mı?
4. Posta kodu teslimat bölgesinde mi?

### "Ürünler görünmüyor" sorunu
1. Supabase → Table Editor → `products` tablosunda ürün var mı?
2. `is_active = true` olan ürünler var mı?
3. Category'nin `is_active = true` olduğunu doğrulayın
4. Tarayıcı konsolunu açın (F12) — hata mesajı var mı?

### "Admin sayfasına girilemiyor" sorunu
1. Supabase → Table Editor → `profiles` tablosunda ilgili kullanıcının `role` alanını kontrol edin
2. `manager` olarak ayarlandığından emin olun
3. Çıkış yapıp tekrar giriş yapın

### "Görsel yüklenemiyor" sorunu
1. Cloudinary Dashboard → **"Settings"** → **"Upload"** → Upload Presets
2. `smash47_speisekarte` presetinin `Unsigned` modunda olduğunu doğrulayın
3. `.env` dosyasında `VITE_CLOUDINARY_UPLOAD_PRESET` ve `VITE_CLOUDINARY_CLOUD_NAME` doğru mu?
4. Netlify'daki environment variable'ların da güncel olduğunu kontrol edin

### "Realtime çalışmıyor" sorunu
1. Supabase → **"Database"** → **"Replication"** sayfasına gidin
2. `orders` tablosunun publikasyonda olduğunu doğrulayın:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
   `orders` listede görünmeli
3. Yoksa ekleyin:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE orders;
   ```

### "Build başarısız" Netlify sorunu
1. Netlify → **"Deploys"** → Başarısız deploy'a tıklayın → Logları inceleyin
2. **Base directory**'nin `smash47-app` olduğunu kontrol edin
3. **Publish directory**'nin `smash47-app/dist` olduğunu kontrol edin
4. Environment variable'ların eklendiğini doğrulayın

---

## Özet — Gerekli Hesaplar

| Servis | URL | Ne İçin |
|--------|-----|---------|
| GitHub | github.com | Kod deposu |
| Supabase | supabase.com | Veritabanı, Auth, Realtime, Edge Functions |
| Cloudinary | cloudinary.com | Ürün görseli yükleme ve depolama |
| Resend | resend.com | Email gönderimi |
| Netlify | netlify.com | Frontend hosting ve otomatik deploy |
| IONOS (veya başka) | ionos.de | Domain ve DNS yönetimi |

---

## Hızlı Komut Referansı

```bash
# Geliştirme sunucusunu başlat
cd smash47-app && npm run dev

# Production build al
cd smash47-app && npm run build

# TypeScript hata kontrolü
cd smash47-app && npx tsc --noEmit

# Edge Function deploy et
supabase functions deploy send-order-confirmation --project-ref PROJE_ID

# Secret ekle
supabase secrets set ANAHTAR=DEGER --project-ref PROJE_ID

# Secret listesi gör
supabase secrets list --project-ref PROJE_ID

# Git push (Netlify otomatik deploy tetiklenir)
git add .
git commit -m "değişiklik açıklaması"
git push
```
