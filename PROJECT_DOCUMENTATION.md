# Smash47 — Proje Dokümantasyonu

> Smash47, Hildesheim/Almanya'da faaliyet gösteren bir smash burger restoranı için geliştirilmiş, tam kapsamlı bir online sipariş sistemidir. UberEats benzeri bir müşteri arayüzü ve gerçek zamanlı admin paneli içerir.

---

## İçindekiler

1. [Teknoloji Stack'i](#1-teknoloji-stacki)
2. [Proje Yapısı](#2-proje-yapısı)
3. [Sayfa & Özellik Detayları](#3-sayfa--özellik-detayları)
4. [State Management (Zustand)](#4-state-management-zustand)
5. [Servisler (API Katmanı)](#5-servisler-api-katmanı)
6. [Supabase Veritabanı Şeması](#6-supabase-veritabanı-şeması)
7. [Güvenlik Mimarisi](#7-güvenlik-mimarisi)
8. [Email Sistemi (Resend)](#8-email-sistemi-resend)
9. [Sipariş Akışı (A'dan Z'ye)](#9-sipariş-akışı-adan-zye)
10. [Admin Panel Özellikleri](#10-admin-panel-özellikleri)
11. [Müşteri Özellikleri](#11-müşteri-özellikleri)
12. [Üçüncü Taraf Servisler](#12-üçüncü-taraf-servisler)
13. [Deployment Mimarisi](#13-deployment-mimarisi)
14. [Ortam Değişkenleri](#14-ortam-değişkenleri)
15. [Bilinen Limitasyonlar](#15-bilinen-limitasyonlar)

---

## 1. Teknoloji Stack'i

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Frontend Framework | React + Vite | 19.x / 8.x |
| Dil | TypeScript | ~6.0 |
| Stil | Tailwind CSS | 4.x |
| Animasyon | Framer Motion | 12.x |
| State Yönetimi | Zustand | 5.x |
| Veritabanı | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth (JWT) | — |
| Email | Resend | — |
| Görsel CDN | Cloudinary | — |
| Hosting | Netlify | — |
| Edge Functions | Supabase (Deno runtime) | — |
| Grafikler | Recharts | 3.x |
| Bildirimler | react-hot-toast | 2.x |
| İkonlar | Lucide React | — |

---

## 2. Proje Yapısı

```
Smash47-antigravity/
├── smash47-app/                    # React uygulaması
│   ├── src/
│   │   ├── App.tsx                 # Ana routing ve layout
│   │   ├── pages/
│   │   │   ├── HomePage.tsx        # Ana menü sayfası
│   │   │   ├── CheckoutPage.tsx    # Sipariş oluşturma sayfası
│   │   │   ├── AuthPage.tsx        # Giriş / Kayıt sayfası
│   │   │   ├── customer/
│   │   │   │   └── ProfilePage.tsx # Kullanıcı profil sayfası
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── AdminOrders.tsx
│   │   │   │   ├── AdminMenu.tsx
│   │   │   │   ├── AdminCampaigns.tsx
│   │   │   │   ├── AdminCustomers.tsx
│   │   │   │   ├── AdminSettings.tsx
│   │   │   │   └── AdminLoginPage.tsx
│   │   │   └── legal/             # Impressum, AGB, Datenschutz
│   │   ├── components/
│   │   │   ├── layout/            # Header, Footer, AdminLayout
│   │   │   ├── menu/              # ProductCard, ProductModal, CategoryNav
│   │   │   ├── cart/              # CartSidebar, OrderNoteModal
│   │   │   └── ui/                # Button, Input, Modal, Badge vb.
│   │   ├── store/                 # Zustand store'ları
│   │   │   ├── authStore.ts
│   │   │   ├── cartStore.ts
│   │   │   ├── menuStore.ts
│   │   │   ├── orderStore.ts
│   │   │   └── restaurantStore.ts
│   │   ├── services/              # Supabase API çağrıları
│   │   │   ├── authService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── productService.ts
│   │   │   ├── couponService.ts
│   │   │   ├── customerService.ts
│   │   │   └── restaurantService.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts        # Supabase client başlatma
│   │   │   ├── utils.ts           # Yardımcı fonksiyonlar
│   │   │   └── errorHandler.ts    # Merkezi hata yönetimi
│   │   └── types/
│   │       └── index.ts           # Tüm TypeScript tipleri
│   ├── .env                       # Ortam değişkenleri
│   └── vite.config.ts
├── supabase/
│   └── functions/
│       └── send-order-confirmation/
│           └── index.ts           # Email Edge Function (Deno)
├── supabase_schema.sql            # Tam veritabanı şeması
├── security_fixes_v3.sql          # RPC fonksiyonları & RLS politikaları
└── netlify.toml                   # Netlify yapılandırması
```

---

## 3. Sayfa & Özellik Detayları

### Müşteri Sayfaları

#### `HomePage.tsx` — Ana Menü Sayfası
- Restoran hero banner'ı (dinamik görseller)
- Sticky kategori navigasyonu (scroll'a göre aktif kategori vurgusu)
- Ürün arama (ad ve açıklama bazlı filtreleme)
- "En Popüler Ürünler" carousel bölümü (`is_most_liked = true` ürünler)
- Kategoriye tıklayınca smooth scroll
- Ürün kartlarına tıklayınca `ProductModal` açılır
- Skeleton loader animasyonları (yüklenme sırasında)
- Restoran kapalı uyarısı (mesai saati dışında)

#### `CheckoutPage.tsx` — Sipariş Sayfası
- **4 Durum:** Form → Onay Bekleniyor → Başarı / Reddedildi
- **Form Validasyonu:** Ad, telefon, email, sokak, şehir, posta kodu
- **Teslimat Bölgesi Kontrolü:** Müşteri posta kodu aktif teslimat bölgesinde mi?
- **Min. Sipariş Tutarı:** Bölgeye göre dinamik minimum sipariş
- **Kupon Kodu:** İndirim kodu uygulama (client + server doğrulama)
- **Kayıtlı Adres:** Giriş yapmış kullanıcının ilk kayıtlı adresi otomatik doldurulur
- **Ödeme Yöntemi:** Barzahlung (nakit) veya Kartenzahlung (kapıda kart)
- **Real-time Onay Bekle:** Sipariş verildikten sonra WebSocket ile admin onayı beklenir
- **Animasyonlu Ekranlar:** Onay bekleme, başarı ve red ekranları Framer Motion ile

#### `AuthPage.tsx` — Giriş / Kayıt Sayfası
- Giriş (`/login`) ve Kayıt (`/register`) aynı component, mod parametresiyle ayrılır
- Kayıt alanları: Email, şifre, tam ad, telefon
- Email doğrulama bağlantısı gönderme
- Onay emailini yeniden gönderme butonu
- Admin rolündeki kullanıcılar giriş sonrası `/admin`'e yönlendirilir

#### `ProfilePage.tsx` — Profil Sayfası
- **3 Sekme:** Profil, Adresler, Bestellungen (Siparişler)
- **Profil:** Ad, telefon güncelleme; şifre değiştirme
- **Adresler:** Yeni adres ekleme (label, sokak, PLZ, şehir), silme
- **Siparişler:** Kullanıcının tüm geçmiş siparişleri listelenir
  - Aktif siparişlerde animasyonlu 4 adımlı takip çubuğu
  - Her adım aktif olunca emoji hareket eder (🕐 döner, 👨‍🍳 sallanır, 🛵 kayar vb.)
  - Aktif adım ile tamamlanan arasındaki çizgi akan yeşil animasyonla dolar
  - "Wiederholen" butonu ile aynı sipariş sepete eklenir

#### Legal Sayfalar
- `ImpressumPage.tsx` — Alman hukuku gereği zorunlu künye sayfası
- `DatenschutzPage.tsx` — GDPR gizlilik politikası
- `AgbPage.tsx` — Kullanım koşulları

---

### Admin Sayfaları

#### `AdminDashboard.tsx` — Yönetim Paneli Anasayfa
- **Gerçek Zamanlı KPI Kartları:**
  - Bugünkü ciro (€)
  - Bugünkü sipariş sayısı
  - Toplam müşteri sayısı
  - Ortalama sipariş değeri
- **Haftalık Ciro Grafiği:** Recharts Alan grafiği (son 7 gün)
- **Teslimat Toggle:** Tek tıkla siparişi aç/kapat
- **Son Siparişler Listesi:** Son 4 sipariş, durumu ile birlikte
- **Durum Breakdown:** Bekleyen, Hazırlanan, Teslim Edilen sayıları
- **Günlük Hedef Progress Bar:** Belirlenen ciro hedefine göre ilerleme

#### `AdminOrders.tsx` — Sipariş Yönetimi
- Filtre sekmeleri: Tümü, Bekleyen, Hazırlanan, Yolda, Teslim Edildi, İptal
- Her siparişin kart görünümü (sipariş no, müşteri, tutar, saat)
- Sipariş detay paneli (mobilde tam ekran, masaüstünde sidebar):
  - Müşteri adı, telefon, adres, notlar
  - Ürün listesi (extras ve notlar dahil)
  - Toplam tutar ve ödeme yöntemi
- **Durum Akışı:** Bekleyen → Onaylandı → Hazırlanıyor → Yolda → Teslim Edildi
- **İptal/Red:** Siparişi iptal etme
- **Bon Yazdırma:** Tarayıcı print diyaloğu ile formatlı fiş
- **Ses Bildirimi:** Yeni sipariş gelince ses çalar (açma/kapama toggle)
- **Gerçek Zamanlı Güncelleme:** Supabase Realtime ile anlık senkronizasyon

#### `AdminMenu.tsx` — Menü Yönetimi
- Kategoriye göre ürün listeleme ve filtreleme
- Ürün ekleme / düzenleme / silme
- **Ürün Alanları:**
  - Ad, açıklama, fiyat, kategori
  - Kalori, alerjenler
  - Özellik bayrakları: En çok beğenilen, vejetaryen, vegan, helal, aktif
  - Extra grupları (sos, boyut, ekstra malzeme seçenekleri — yapısal JSONB)
- **Görsel Yükleme:** Cloudinary'e upload + ImageCropModal ile kırpma
- **Sıralama:** Ürün pozisyonu sürükle-bırak ile değiştirilebilir
- **Optimistik Güncelleme:** Değişiklik önce local'e yansır, hata varsa geri alınır
- Aktif/pasif toggle ile ürünü menüden anlık kaldırma

#### `AdminCampaigns.tsx` — Kupon / İndirim Yönetimi
- **Kupon Alanları:**
  - Kod (büyük harf, benzersiz)
  - İndirim türü: Yüzde (%) veya sabit tutar (€)
  - İndirim değeri
  - Minimum sipariş tutarı
  - Maksimum kullanım sayısı (boş = sınırsız)
  - Yalnızca ilk siparişe özel bayrağı
  - Geçerlilik tarihi
  - Aktif/pasif toggle
- Kupon arama ve listeleme
- Mevcut kuponu düzenleme
- Kupon silme (onay modali ile)

#### `AdminCustomers.tsx` — Müşteri Yönetimi
- Müşteri listesi: ad, email, telefon ile arama
- Müşteri detay modali:
  - Profil bilgileri (ad, email, telefon, kayıt tarihi)
  - Toplam harcama tutarı
  - Son 20 sipariş geçmişi
  - Kayıtlı adresler
  - Sipariş durum breakdown'ı

#### `AdminSettings.tsx` — Restoran Ayarları
- **Genel Bilgiler:** Ad, açıklama, adres, telefon, email
- **Çalışma Saatleri:** Her gün için ayrı açılış/kapanış saati + kapalı günü işaretleme
- **Teslimat Ayarları:**
  - Teslimat ücreti
  - Minimum sipariş tutarı
  - Tahmini teslimat süresi
  - Teslimat yarıçapı (km)
  - Teslimat bölgeleri (JSONB: isim, min tutar, ücret, koordinatlar)
- **Sistem Toggleları:** Teslimat aktif mi, helal sertifikası, duyuru bandı
- **Duyuru Metni:** Ana sayfada görünen bildirim banneri
- **Günlük Ciro Hedefi:** Dashboard progress bar için
- **Hero Görseller:** Anasayfa banner görsellerini yönetme

---

## 4. State Management (Zustand)

### `authStore.ts`

Kullanıcı oturumu ve profil yönetimi.

```typescript
{
  user: UserProfile | null      // Giriş yapan kullanıcı profili
  session: Session | null       // Supabase oturum token'ı
  isLoading: boolean
  isInitialized: boolean        // İlk yüklenme tamamlandı mı?
  isAdmin: boolean              // manager | cashier | kitchen rolüne sahip mi?
}
```

- **localStorage Anahtarı:** `smash47-auth`
- **Persist Edilen:** Yalnızca `session`
- **Admin Rolleri:** `manager`, `cashier`, `kitchen`
- **Başlangıçta:** `onAuthStateChange` ile oturum dinlenir, profil DB'den çekilir

### `cartStore.ts`

Alışveriş sepeti yönetimi.

```typescript
{
  items: CartItem[]             // Sepetteki ürünler
  isOpen: boolean               // Sepet sidebar'ı açık mı?
  globalNote: string            // Tüm sipariş için not
}
```

- **localStorage Anahtarı:** `smash47-cart`
- **Persist Edilen:** `items` ve `globalNote`
- **Güvenlik:** Rehydration'da UUID olmayan `product_id`'ler temizlenir (eski mock data kalıntısı)
- **Fiyat Hesaplama:** `(base_price + extras_total) × quantity`
- **Kural:** Restoran kapalıysa veya teslimat pasifse ürün eklenemez

### `menuStore.ts`

Kategori ve ürün verisi.

```typescript
{
  categories: Category[]
  products: Product[]
  isLoading: boolean
  error: string | null
}
```

- **Persist:** Yok (her zaman DB'den çekilir)
- **Optimistik Güncelleme:** Admin ürün güncellediğinde önce local state değişir, DB çağrısı başarısızsa geri alınır

### `orderStore.ts`

Admin sipariş listesi ve gerçek zamanlı güncelleme.

```typescript
{
  orders: Order[]
  isLoading: boolean
  error: string | null
  soundEnabled: boolean         // Yeni sipariş sesi açık mı?
}
```

- **Realtime:** Supabase `postgres_changes` kanalına abone olur
- **Ses:** Yeni `INSERT` gelince MP3 çalar (lazy load)
- **Sadece Admin için** — Müşteri profil sayfası `fetchUserOrders` ile kendi siparişlerini ayrıca çeker

### `restaurantStore.ts`

Restoran ayarları.

```typescript
{
  settings: RestaurantSettings | null
  isLoading: boolean
  error: string | null
}
```

- Uygulama başlarken `fetchSettings()` ile yüklenir
- Teslimat açma/kapama butonu bu store üzerinden çalışır

---

## 5. Servisler (API Katmanı)

Tüm Supabase çağrıları `services/` klasöründeki fonksiyonlara toplanmıştır. Sayfalar/component'lar doğrudan Supabase client kullanmaz.

### `authService.ts`
| Fonksiyon | Açıklama |
|-----------|----------|
| `signIn(email, password)` | Supabase email/şifre ile giriş |
| `signUp(email, password, metadata)` | Yeni hesap oluşturma (ad, telefon metadata'ya eklenir) |
| `signOut()` | Oturumu sonlandır |
| `getSession()` | Mevcut oturumu al |
| `changePassword(newPassword)` | Şifre güncelleme |
| `fetchProfile(userId)` | `profiles` tablosundan kullanıcı profili çek |
| `updateProfile(userId, updates)` | Profil alanlarını güncelle |

### `orderService.ts`
| Fonksiyon | Açıklama |
|-----------|----------|
| `fetchAllOrders()` | Tüm siparişler (admin) |
| `fetchTodayOrders()` | Bugünün siparişleri |
| `fetchUserOrders(userId)` | Belirli kullanıcının siparişleri |
| `fetchWeekOrders()` | Son 7 günün ciro & durum verisi (grafik için) |
| `fetchPendingCount()` | Bekleyen sipariş sayısı |
| `updateOrderStatus(orderId, status)` | Sipariş durumu güncelle |
| `createOrder(input)` | RPC `create_order_secure()` çağrısı — server-side fiyat hesaplama |
| `fetchOrderByNumber(orderNumber)` | Sipariş numarasına göre sipariş bul |
| `subscribeToOrders(callback)` | Realtime Postgres subscription |

### `productService.ts`
| Fonksiyon | Açıklama |
|-----------|----------|
| `fetchCategories()` | Aktif kategoriler (pozisyona göre sıralı) |
| `fetchProducts()` | Tüm ürünler (pozisyona göre sıralı) |
| `createProduct(data)` | Yeni ürün ekle |
| `updateProduct(id, updates)` | Ürün güncelle |
| `deleteProduct(id)` | Ürün sil |

### `couponService.ts`
| Fonksiyon | Açıklama |
|-----------|----------|
| `fetchCoupons()` | Tüm kuponlar (admin) |
| `validateCoupon(code, subtotal, userId)` | Client-side kupon doğrulama |
| `createCoupon(data)` | Yeni kupon oluştur |
| `updateCoupon(id, data)` | Kupon güncelle |
| `deleteCoupon(id)` | Kupon sil |

**Kupon Doğrulama Adımları:**
1. Aktif mi?
2. Süresi dolmamış mı?
3. Maksimum kullanım aşılmış mı?
4. Yalnızca ilk sipariş bayrağı varsa, kullanıcının önceki siparişi var mı?
5. Minimum sipariş tutarı karşılanıyor mu?
6. İndirim hesaplama: yüzde ise `subtotal * (value/100)`, sabit ise `value`

### `restaurantService.ts`
| Fonksiyon | Açıklama |
|-----------|----------|
| `fetchSettings()` | Restoran ayarlarını çek (tek satır) |
| `updateSettings(id, updates)` | Ayarları güncelle |

---

## 6. Supabase Veritabanı Şeması

### Tablolar

#### `restaurant_settings` (tek satır)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | — |
| `name` | TEXT | Restoran adı |
| `description` | TEXT | Kısa açıklama |
| `address` | TEXT | Fiziksel adres |
| `phone`, `email` | TEXT | İletişim |
| `logo_url` | TEXT | Logo URL (Cloudinary) |
| `hero_images` | JSONB | Banner görsel URL'leri dizisi |
| `is_delivery_active` | BOOLEAN | Teslimat açık/kapalı |
| `delivery_fee` | DECIMAL | Teslimat ücreti (€) |
| `min_order_amount` | DECIMAL | Minimum sipariş tutarı (€) |
| `estimated_delivery_time` | INT | Tahmini teslimat dakikası |
| `delivery_radius_km` | DECIMAL | Teslimat yarıçapı |
| `delivery_zones` | JSONB | Teslimat bölgeleri dizisi |
| `hours` | JSONB | Çalışma saatleri (gün bazlı) |
| `is_halal_certified` | BOOLEAN | Helal sertifikası |
| `announcement` | TEXT | Duyuru metni |
| `is_announcement_active` | BOOLEAN | Duyuru görünür mü? |
| `revenue_goal_daily` | DECIMAL | Günlük ciro hedefi |
| `created_at`, `updated_at` | TIMESTAMPTZ | — |

**`hours` JSONB Yapısı:**
```json
{
  "monday": { "open": "11:30", "close": "22:00", "is_closed": false },
  "tuesday": { "open": "11:30", "close": "22:00", "is_closed": false },
  ...
  "sunday": { "open": "11:30", "close": "22:00", "is_closed": false }
}
```

**`delivery_zones` JSONB Yapısı:**
```json
[
  {
    "name": "31134 Hildesheim",
    "min_order": 12.00,
    "delivery_fee": 2.00,
    "postal_codes": ["31134", "31135"]
  }
]
```

---

#### `categories`
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | — |
| `name` | TEXT | Kategori adı (ör. "Burger") |
| `slug` | TEXT UNIQUE | URL slug (ör. "burger") |
| `position` | INT | Sıralama pozisyonu |
| `is_active` | BOOLEAN | Aktif mi? |
| `created_at` | TIMESTAMPTZ | — |

---

#### `products`
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | — |
| `category_id` | UUID FK | Kategori referansı |
| `name` | TEXT | Ürün adı |
| `description` | TEXT | Açıklama |
| `price` | DECIMAL | Temel fiyat (€) |
| `image_url` | TEXT | Cloudinary görsel URL |
| `is_active` | BOOLEAN | Menüde görünür mü? |
| `is_most_liked` | BOOLEAN | "En Popüler" bölümünde göster |
| `is_vegetarian` | BOOLEAN | Vejetaryen mi? |
| `is_vegan` | BOOLEAN | Vegan mı? |
| `is_halal` | BOOLEAN | Helal mi? |
| `allergens` | JSONB | Alerjen listesi |
| `calories` | INT | Kalori değeri |
| `extra_groups` | JSONB | Ek seçenekler (sos, boyut vb.) |
| `position` | INT | Kategori içi sıralama |
| `created_at`, `updated_at` | TIMESTAMPTZ | — |

**`extra_groups` JSONB Yapısı:**
```json
[
  {
    "id": "uuid",
    "name": "Sos Seçimi",
    "required": true,
    "multiple": false,
    "options": [
      { "id": "uuid", "name": "Chili Cheese Sauce", "price": 0.00 },
      { "id": "uuid", "name": "BBQ Sauce", "price": 0.00 }
    ]
  }
]
```

---

#### `profiles` (auth.users ile bağlantılı)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK, FK→auth.users | — |
| `email` | TEXT | Email adresi |
| `full_name` | TEXT | Tam ad |
| `phone` | TEXT | Telefon numarası |
| `birth_date` | DATE | Doğum tarihi |
| `role` | TEXT | `customer` / `cashier` / `kitchen` / `manager` |
| `addresses` | JSONB | Kayıtlı adresler dizisi |
| `loyalty_points` | INT | Sadakat puanları |
| `total_orders` | INT | Toplam sipariş sayısı |
| `created_at`, `updated_at` | TIMESTAMPTZ | — |

**`addresses` JSONB Yapısı:**
```json
[
  {
    "id": "uuid",
    "label": "Zuhause",
    "street": "Musterstraße 1",
    "city": "Hildesheim",
    "postal_code": "31134",
    "lat": null,
    "lng": null
  }
]
```

---

#### `orders`
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | — |
| `order_number` | TEXT UNIQUE | S47-{timestamp}-{random} formatı |
| `user_id` | UUID FK, nullable | Misafir siparişler için NULL |
| `customer_name`, `customer_phone`, `customer_email` | TEXT | — |
| `delivery_address` | TEXT | Teslimat adresi (tam metin) |
| `items` | JSONB | Sipariş kalemleri dizisi |
| `subtotal` | DECIMAL | Ara toplam (€) |
| `delivery_fee` | DECIMAL | Teslimat ücreti (€) |
| `discount_amount` | DECIMAL | Kupon indirimi (€) |
| `total` | DECIMAL | Genel toplam (€) |
| `coupon_code` | TEXT | Kullanılan kupon kodu |
| `status` | TEXT | `pending` / `confirmed` / `preparing` / `on_the_way` / `delivered` / `cancelled` |
| `payment_method` | TEXT | `cash` / `card_on_delivery` |
| `estimated_delivery_time` | INT | Tahmini teslimat dakikası |
| `notes` | TEXT | Müşteri notu |
| `rejection_reason` | TEXT | Red gerekçesi |
| `created_at`, `updated_at` | TIMESTAMPTZ | — |

**`items` JSONB Yapısı:**
```json
[
  {
    "product_id": "uuid",
    "product_name": "Triple Smash Burger",
    "quantity": 2,
    "unit_price": 12.90,
    "subtotal": 25.80,
    "extras": [
      { "id": "uuid", "name": "Chili Cheese Sauce", "price": 0.00, "group_name": "Sos" }
    ],
    "note": "Ekstra acı"
  }
]
```

---

#### `coupons`
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID PK | — |
| `code` | TEXT UNIQUE | Büyük harfli kupon kodu |
| `discount_type` | TEXT | `percentage` / `fixed` |
| `discount_value` | DECIMAL | İndirim değeri |
| `min_order_amount` | DECIMAL | Minimum sipariş tutarı |
| `max_uses` | INT, nullable | Maksimum kullanım (NULL = sınırsız) |
| `used_count` | INT | Kaç kez kullanıldı |
| `is_first_order_only` | BOOLEAN | Yalnızca ilk siparişe özel mi? |
| `is_active` | BOOLEAN | Aktif mi? |
| `expires_at` | TIMESTAMPTZ, nullable | Son kullanma tarihi |
| `created_at` | TIMESTAMPTZ | — |

---

### Triggerlar

#### `handle_new_user()` — AFTER INSERT on `auth.users`
- Yeni kullanıcı kaydolduğunda otomatik `profiles` kaydı oluşturur
- `raw_user_meta_data`'dan `full_name` ve `phone` çeker

#### `update_updated_at()` — BEFORE UPDATE
- Şu tablolara uygulanır: `orders`, `products`, `profiles`, `restaurant_settings`
- Güncelleme anında `updated_at` alanını otomatik günceller

---

### Sunucu Taraflı Fonksiyonlar

#### `create_order_secure()` — RPC Fonksiyonu

**Amaç:** Müşteri tarafından fiyat manipülasyonunu önlemek için tüm fiyat hesaplamasını sunucu tarafında yapar.

**Parametreler:**
- `p_order_number` — Sipariş numarası
- `p_customer_name`, `p_customer_phone`, `p_customer_email` — Müşteri bilgileri
- `p_delivery_address` — Teslimat adresi
- `p_items` — JSONB (yalnızca `product_id` ve `quantity` — fiyat YOK)
- `p_coupon_code` — Kupon kodu (nullable)
- `p_payment_method` — Ödeme yöntemi
- `p_notes` — Sipariş notu
- `p_estimated_delivery_time` — Tahmini teslimat süresi

**İşlem Adımları:**
1. Auth kontrolü — yalnızca giriş yapmış kullanıcılar sipariş verebilir
2. Tüm `product_id`'lerin DB'de mevcut ve aktif olduğunu doğrula
3. Her ürün için birim fiyatı DB'den al (client'ın gönderdiği fiyatı yoksay)
4. Extra'ların fiyatlarını `extra_groups` JSONB'inden doğrula
5. Ara toplamı server'da hesapla
6. Teslimat ücreti ve min sipariş kontrolü
7. Kupon doğrulama: aktif, süresi dolmamış, kullanım limiti, ilk sipariş kontrolü
8. İndirim server'da hesapla, `used_count` artır
9. Nihai toplam: `subtotal + delivery_fee - discount`
10. Siparişi DB'ye ekle
11. Sipariş ID'sini döndür

**Güvenlik:** `SECURITY DEFINER` — RLS'yi bypass eder, direktif INSERT RLS politikasıyla engellenmiştir

---

### Row Level Security (RLS) Politikaları

| Tablo | Politika | Kural |
|-------|----------|-------|
| `restaurant_settings` | Herkes okuyabilir | `TRUE` |
| `restaurant_settings` | Sadece yönetici yazabilir | `role = 'manager'` |
| `categories` | Herkes okuyabilir | `TRUE` |
| `categories` | Admin yazabilir | `role IN ('manager', 'cashier')` |
| `products` | Herkes okuyabilir | `TRUE` |
| `products` | Admin yazabilir | `role IN ('manager', 'cashier')` |
| `orders` | Kendi siparişini okuyabilir | `user_id = auth.uid()` VEYA admin |
| `orders` | Direkt INSERT yasak | `FALSE` — yalnızca RPC fonksiyonu ekleyebilir |
| `orders` | Admin günceller | `role IN ('manager', 'cashier', 'kitchen')` |
| `profiles` | Kendi profilini okur | `id = auth.uid()` |
| `profiles` | Kendi profilini günceller | `id = auth.uid()` |
| `profiles` | Yönetici tümünü okur | `role = 'manager'` |
| `coupons` | Aktif olanlar herkese açık | `is_active = TRUE` |
| `coupons` | Admin yönetir | `role = 'manager'` |

---

## 7. Güvenlik Mimarisi

### Fiyat Manipülasyonu Koruması
Müşteri tarayıcısından yalnızca `product_id` ve `quantity` gönderilir. Fiyatlar hiçbir zaman client'tan kabul edilmez. `create_order_secure()` RPC fonksiyonu tüm fiyatları veritabanından hesaplar.

### JWT Tabanlı Kimlik Doğrulama
Supabase Auth, her istek için Bearer JWT token kullanır. Token yenilemesi otomatiktir. Çıkış yapıldığında tüm session ve localStorage temizlenir.

### Direkt Tablo Erişim Engeli
`orders` tablosuna direkt INSERT yapılması RLS politikası ile engellenir. Yalnızca `SECURITY DEFINER` yetkisine sahip `create_order_secure()` RPC fonksiyonu sipariş ekleyebilir.

### API Key Güvenliği
- Resend API anahtarı Supabase Edge Function secret'larında saklanır (client'a hiç gönderilmez)
- Supabase `anon_key` yalnızca RLS ile korunan işlemler için kullanılır
- Cloudinary upload preset yalnızca belirli transformasyonlara izin verir

---

## 8. Email Sistemi (Resend)

### Edge Function: `send-order-confirmation`
- **Platform:** Supabase Edge Functions (Deno runtime)
- **Tetikleyici:** Supabase Database Webhook — `orders` tablosunda **UPDATE** eventi

### Tetiklenme Koşulları
Email yalnızca şu durumlarda gönderilir:
- `status` değişimi `confirmed` olduğunda → Sipariş onay emaili müşteriye gider
- `status` değişimi `cancelled` olduğunda → Red emaili müşteriye gider

**Önemli:** `INSERT` eventinde email gönderilmez. Admin onayı gereklidir.

### Email Şablonları

#### Onay Emaili (confirmed)
- Sipariş numarası
- Ürün listesi (extras ve fiyatlar dahil)
- Ara toplam, teslimat ücreti, indirim, genel toplam
- Teslimat adresi
- Tahmini teslimat süresi
- Ödeme yöntemi
- Telefon numarası

#### Red Emaili (cancelled)
- Özür mesajı
- Sipariş numarası
- Restoran telefon numarası (büyük buton)

### Gönderici Adresi
- Domain doğrulandığında: `Smash47 <bestellung@smash47.de>`
- Test modunda: `Smash47 <onboarding@resend.dev>`
- `RESEND_DOMAIN_VERIFIED=true` environment variable ile kontrol edilir

### DNS Gereksinimleri (Spam Önleme)
- **SPF:** `v=spf1 include:_spf-eu.ionos.com include:amazonses.com ~all`
- **DMARC:** `v=DMARC1; p=quarantine; rua=mailto:smash47@skymail.de`
- **DKIM:** Resend panel'inden otomatik eklenir

---

## 9. Sipariş Akışı (A'dan Z'ye)

```
1. MÜŞTERİ → Menüyü inceler, ürün seçer (extras dahil)
      ↓
2. MÜŞTERİ → Sepete ekler (cartStore)
      ↓
3. MÜŞTERİ → Checkout sayfasına gider (/bestellung)
      ↓
4. SİSTEM → Kontroller:
   - Giriş yapılmış mı?
   - Restoran saatleri: açık mı?
   - is_delivery_active: aktif mi?
   - Minimum sipariş tutarı karşılandı mı?
   - Posta kodu teslimat bölgesinde mi?
      ↓
5. MÜŞTERİ → Kupon kodu girer (opsiyonel)
   SİSTEM → Client-side doğrulama: aktif, süresi, kullanım limiti, min tutar
      ↓
6. MÜŞTERİ → "Jetzt bestellen" butonuna basar
      ↓
7. CLIENT → orderService.createOrder() çağırır
   → Supabase RPC: create_order_secure()
      ↓
8. SERVER (RPC):
   a. Auth kontrolü
   b. Tüm product_id'leri DB'den doğrular
   c. Fiyatları DB'den alır (client fiyatı yoksayılır)
   d. Ara toplamı hesaplar
   e. Kupon doğrular & indirimi hesaplar
   f. used_count artar
   g. Siparişi INSERT eder (status: 'pending')
   h. Sipariş ID döner
      ↓
9. CLIENT → Sipariş ID alınır, sepet temizlenir
   → "⏳ Onay Bekleniyor" ekranı gösterilir
   → Supabase Realtime: sipariş ID'si üzerinden WebSocket açılır
      ↓
10. ADMİN → AdminOrders sayfasında yeni sipariş görünür (ses çalar)
    ADMİN → Sipariş detayını inceler
    ADMİN → "Bestätigen" veya "Stornieren" butonuna basar
      ↓
11. SERVER → orders.status güncellenir
   → Supabase Database Webhook tetiklenir
   → Edge Function: send-order-confirmation çağrılır
      ↓
12. RESEND → Müşteriye onay veya red emaili gönderilir
      ↓
13. CLIENT → WebSocket güncelleme alır:
    - confirmed → "🎉 Bestellung bestätigt!" ekranı
    - cancelled → "😔 Bestellung abgelehnt" ekranı + telefon
      ↓
14. MÜŞTERİ → Profil sayfasında siparişini takip eder
    - Pending → Confirmed → Preparing → On the way
    - Her aşama için animasyonlu progress bar
```

---

## 10. Admin Panel Özellikleri

### Rol Bazlı Erişim

| Özellik | manager | cashier | kitchen |
|---------|---------|---------|---------|
| Dashboard | ✓ | ✓ | ✓ |
| Sipariş görüntüleme | ✓ | ✓ | ✓ |
| Sipariş durumu güncelleme | ✓ | ✓ | ✓ |
| Sipariş iptal | ✓ | ✓ | ✓ |
| Bon yazdırma | ✓ | ✓ | ✓ |
| Menü yönetimi | ✓ | ✓ | — |
| Restoran ayarları | ✓ | — | — |
| Kupon yönetimi | ✓ | — | — |
| Müşteri görüntüleme | ✓ | — | — |
| Teslimat toggle | ✓ | — | — |

### Gerçek Zamanlı Özellikler
- Yeni sipariş gelince ses bildirimi (toggle ile açılır/kapanır)
- Sipariş durumu admin güncelledikçe anında yansır
- Dashboard KPI'ları canlı güncellenir

---

## 11. Müşteri Özellikleri

- Kategoriye göre menü gezinme
- Ürün arama
- Extras ile ürün seçimi (zorunlu/opsiyonel gruplar)
- Ürün notu ekleme
- Sipariş notu ekleme
- Sepet sidebar (aç/kapat, miktar artır/azalt, sil)
- Kupon kodu uygulama
- Kayıtlı adreslerden hızlı seçim
- Sipariş vericten sonra gerçek zamanlı durum takibi
- Profil yönetimi (ad, telefon, şifre)
- Adres defteri (Zuhause, Büro vb.)
- Sipariş geçmişi
- "Wiederholen" ile geçmiş siparişi tekrarlama
- Sipariş durum animasyonu (4 aşamalı progress bar)

---

## 12. Üçüncü Taraf Servisler

### Supabase
- **Kullanım:** PostgreSQL veritabanı, kimlik doğrulama, gerçek zamanlı abonelikler, Edge Functions
- **Plan:** Free tier (proje için yeterli)
- **Bölge:** EU West (Frankfurt) — GDPR uyumlu

### Cloudinary
- **Kullanım:** Ürün görseli yükleme ve dönüştürme
- **Upload Preset:** `smash47_speisekarte` (unsigned upload)
- **Entegrasyon:** AdminMenu.tsx — görsel seçme, kırpma, upload

### Resend
- **Kullanım:** Sipariş onay ve red emailleri
- **Domain:** `smash47.de` (DNS doğrulamalı)
- **Plan:** Free tier (aylık 3.000 email)

### Netlify
- **Kullanım:** React uygulaması hosting
- **Build:** Vite → `dist/` klasörü
- **SPA Redirect:** `netlify.toml` ile `/*` → `index.html`
- **Otomatik Deploy:** Git push sonrası otomatik

---

## 13. Deployment Mimarisi

```
GitHub Repository
       ↓ (git push)
   Netlify CI/CD
       ↓ (npm run build)
   dist/ klasörü
       ↓
  CDN (Netlify Edge)
       ↓
  Kullanıcı Tarayıcısı
       ↓ (API çağrıları)
  Supabase (PostgreSQL + Auth + Realtime)
       ↓ (webhook - sipariş onayı/reddi)
  Edge Function (Deno)
       ↓
  Resend (Email API)
       ↓
  Müşteri Email'i
```

---

## 14. Ortam Değişkenleri

### Frontend (`.env` dosyası / Netlify Dashboard)
| Değişken | Açıklama |
|----------|----------|
| `VITE_SUPABASE_URL` | Supabase proje URL'i |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonim anahtar (public) |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary hesap adı |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset |

### Backend (Supabase Edge Function Secrets)
| Değişken | Açıklama |
|----------|----------|
| `RESEND_API_KEY` | Resend API anahtarı |
| `RESEND_DOMAIN_VERIFIED` | `true` ise domain emaili, `false` ise test emaili |

---

## 15. Bilinen Limitasyonlar

| Konu | Durum | Not |
|------|-------|-----|
| Sadakat puanları | UI hazır, backend eksik | Puan kazanma/harcama mantığı yazılmadı |
| Misafir siparişi | Kısmen destekleniyor | `user_id = NULL` olarak kaydedilir, profille bağlantısı yok |
| Menü gerçek zamanlı | Yok | Ürün değişiklikleri için müşteri sayfayı yenilemeli |
| Envanter takibi | Yok | Stok yönetimi; yalnızca `is_active` flag ile ürün gizlenebilir |
| Online ödeme | Yok | Yalnızca kapıda nakit veya kart |
| Push bildirimleri | Planlanmış | PWA entegrasyonu Phase 2'de |
| Google Maps | Kısmi | MapSection var, teslimat bölgesi poligon entegrasyonu tamamlanmadı |
