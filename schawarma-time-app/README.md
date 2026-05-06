# Schawarma-Time — Online Sipariş Sistemi

React + TypeScript + Firebase üzerine kurulu restoran sipariş yönetim sistemi.

## Kurulum

Detaylı adım adım kurulum için: [`../INSTALLATION_GUIDE.md`](../INSTALLATION_GUIDE.md)

## Hızlı Başlangıç

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını kendi Firebase/Cloudinary bilgilerinizle doldurun

# 3. Geliştirme sunucusunu başlat
npm run dev

# 4. Production build
npm run build
```

## Gerekli Ortam Değişkenleri

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Firebase proje ID | ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | ✅ |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | ✅ |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud adı | ✅ |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned preset adı | ✅ |

## Teknoloji Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4
- **State:** Zustand
- **Backend/Data:** Firebase (Auth + Firestore)
- **Images:** Cloudinary
- **Hosting:** Cloudflare Workers / Pages

## Proje Yapısı

```
schawarma-time-app/
├── src/
│   ├── components/     # UI bileşenleri
│   ├── pages/          # Sayfalar (HomePage, CheckoutPage, Admin sayfaları)
│   ├── store/          # Zustand state yönetimi
│   ├── services/       # Firebase / Firestore servisleri
│   ├── lib/            # Firebase client, yardımcı fonksiyonlar
│   └── types/          # TypeScript tip tanımları
├── wrangler.toml       # Cloudflare Workers assets konfigürasyonu
└── netlify.toml        # Eski deploy ayarları (gerekirse kaldırılabilir)
```

## Cloudflare Deploy

```bash
# Production build
npm run cf:build

# Workers.dev deploy
npm run cf:deploy
```

Cloudflare tarafında static asset kaynağı doğrudan `dist/` klasörüdür. `src/main.tsx` dosyası production'da servis edilmemelidir.
