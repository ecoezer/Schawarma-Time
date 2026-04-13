# Schawarma-Time — Online Sipariş Sistemi

React + TypeScript + Supabase üzerine kurulu restoran sipariş yönetim sistemi.

## Kurulum

Detaylı adım adım kurulum için: [`../INSTALLATION_GUIDE.md`](../INSTALLATION_GUIDE.md)

## Hızlı Başlangıç

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını kendi Supabase/Cloudinary bilgilerinizle doldurun

# 3. Geliştirme sunucusunu başlat
npm run dev

# 4. Production build
npm run build
```

## Gerekli Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase proje URL'i | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | ✅ |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud adı | ✅ |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned preset adı | ✅ |

## Teknoloji Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4
- **State:** Zustand
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Images:** Cloudinary
- **Email:** Resend
- **Hosting:** Netlify

## Proje Yapısı

```
schawarma-time-app/
├── src/
│   ├── components/     # UI bileşenleri
│   ├── pages/          # Sayfalar (HomePage, CheckoutPage, Admin sayfaları)
│   ├── store/          # Zustand state yönetimi
│   ├── services/       # Supabase API çağrıları
│   ├── lib/            # Supabase client, yardımcı fonksiyonlar
│   └── types/          # TypeScript tip tanımları
├── supabase/
│   ├── schema.sql      # Tam veritabanı şeması (tek kaynak)
│   ├── seed.sql        # Ürün kataloğu verileri
│   └── functions/      # Supabase Edge Functions
└── netlify.toml        # Netlify deployment konfigürasyonu
```
