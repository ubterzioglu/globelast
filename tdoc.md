# Corteqs Globe 4 - Teknik Dokumantasyon

## 1. Proje Ozeti
Corteqs Globe 4, Next.js App Router tabanli bir web uygulamasidir. Amaci, kullanicilarin Google OAuth ile giris yapip kendi konumlarini (sehir/ulke + not) geocode ederek etkinlik haritasina pin gondermesidir. Gonderilen pinler once `pending` olarak kaydedilir, admin moderasyonu sonrasinda `approved` olursa globe uzerinde yayinlanir.

Temel yetenekler:
- 3D globe uzerinde onayli pinlerin gorsellestirilmesi (`react-globe.gl` + `three`)
- Supabase Auth (Google OAuth) ile kullanici girisi
- Supabase Postgres uzerinde pin saklama, RLS policy'leri ile erisim kontrolu
- Nominatim veya opsiyonel Google Geocoding ile koordinat bulma
- Admin panelinden `approve/reject` moderasyon akisi

## 2. Teknoloji Yigini
- Framework: Next.js `16.2.6` (App Router)
- UI: React `19.2.4`, Tailwind CSS v4
- Dil: TypeScript (strict mode acik)
- 3D Globe: `react-globe.gl` `2.37.1`, `three` `0.184.0`
- Auth + DB: Supabase (`@supabase/supabase-js` `2.105.4`)
- Lint: ESLint 9 + `eslint-config-next`
- Containerization: Docker (multi-stage build, standalone Next output)

## 3. Klasor ve Katman Mimarisi
Ana klasorler:
- `app/`: App Router sayfalari ve API route'lari
- `components/`: UI bilesenleri (globe, auth, pin modal)
- `lib/`: Supabase client factory, geocoding providerlari, data fetch helper
- `types/`: Ortak TypeScript tipleri
- `supabase/`: SQL schema ve RLS policy tanimlari
- `public/`: Globe texture/background asset'leri

Katmanlar:
1. Presentation Layer (React UI):
   - `app/page.tsx` ana ekran
   - `components/globe/*` globe render + pin gosterimi
   - `components/pins/*` pin ekleme UX
2. API Layer (Next Route Handlers):
   - `app/api/geocode/route.ts`
   - `app/api/admin/pins/[id]/approve/route.ts`
   - `app/api/admin/pins/[id]/reject/route.ts`
   - `app/api/health/route.ts`
3. Data Access Layer:
   - Browser client: `lib/supabase/browser.ts`
   - Service-role client: `lib/supabase/service.ts`
4. Infrastructure/Config:
   - `next.config.ts` (`output: "standalone"`)
   - `Dockerfile` production image

## 4. Calisma Akislari

### 4.1 Ana Sayfa ve Globe
Dosya: `app/page.tsx`
- `GlobeClient` ve `PinLauncher` birlikte render edilir.
- `GlobeClient`, `PremiumGlobe` bilesenini `ssr: false` ile dynamic import eder.

Dosya: `components/globe/PremiumGlobe.tsx`
- Acilista `fetchApprovedPins()` cagirilir.
- `event_pins` tablosundan sadece `approved` kayitlar cekilir.
- Globe ayarlari:
  - autorotate acik
  - night texture + topology bump map
  - pinler kirmizi nokta olarak gosterilir
- Pin tooltip HTML'i `escapeHtml` ile sanitize edilir.
- Seilen pin alt kartta detayli gosterilir.

### 4.2 Login ve Pin Gonderme Akisi
Dosyalar:
- `components/auth/LoginButton.tsx`
- `app/auth/callback/page.tsx`
- `components/pins/PinLauncher.tsx`
- `components/pins/PinFormModal.tsx`

Akis:
1. Kullanici login degilse `Google ile giris yap` butonu gorur.
2. Buton, `supabase.auth.signInWithOAuth({ provider: 'google' })` ile giris baslatir.
3. Callback URL: `<origin>/auth/callback`
4. Callback sayfasi session'i cekip kullaniciyi `/` adresine geri yonlendirir.
5. Login sonrasi `Kendini Pinle` butonu gorunur.
6. Modalda sehir/ulke/not girilir.
7. `Konumu Bul` -> `/api/geocode` POST
8. Adaylar arasindan secim yapilir.
9. `Pinimi Gonder` -> browser supabase client ile `event_pins` insert (`status: pending`).

### 4.3 Admin Moderasyon Akisi
Dosyalar:
- `app/admin/pins/page.tsx`
- `app/api/admin/pins/[id]/approve/route.ts`
- `app/api/admin/pins/[id]/reject/route.ts`

Akis:
1. Admin sayfasi `pending` pinleri listeler.
2. Approve -> ilgili pin `status=approved`, `approved_at=now()`.
3. Reject -> ilgili pin `status=rejected`.
4. Islem sonrasi `/admin/pins`'e redirect.

Not:
- Son guncel kodda redirect relative URL oldugu icin `0.0.0.0` kaynakli gecersiz URL problemi giderilmistir.

## 5. API Uclari

### 5.1 `POST /api/geocode`
Amaç:
- `city` + `country` girdisini geocode edip aday koordinat listesi donmek.

Request body:
- `city: string`
- `country: string`

Validation:
- Her iki alan trim edilir.
- En az 2 karakter olmalidir.

Response:
- `200`: `{ candidates: GeocodeCandidate[] }`
- `400`: zorunlu alan/uzunluk hatasi
- `404`: aday bulunamadi
- `502`: geocoder provider hatalari (Nominatim/Google)
- `500`: diger beklenmeyen hatalar

### 5.2 `POST /api/admin/pins/:id/approve`
Islem:
- `event_pins` kaydini `approved` yapar ve `approved_at` set eder.

Response:
- Basarili: redirect `/admin/pins`
- Hatali: `500` + `{ error }`

### 5.3 `POST /api/admin/pins/:id/reject`
Islem:
- `event_pins` kaydini `rejected` yapar.

Response:
- Basarili: redirect `/admin/pins`
- Hatali: `500` + `{ error }`

### 5.4 `GET /api/health`
Response:
- `200`: `{ ok: true, service: 'corteqs-globe-4' }`

## 6. Veri Modeli (Supabase/Postgres)
Dosya: `supabase/schema.sql`

### 6.1 `admin_users`
Alanlar:
- `user_id uuid` (PK, `auth.users(id)` FK)
- `created_at timestamptz`

Amac:
- Admin kullanicilari listelemek.
- `is_admin(uid)` fonksiyonu bu tabloya bakar.

### 6.2 `event_pins`
Alanlar (temel):
- Kimlik: `id`, `user_id`, `event_key`
- Icerik: `display_name`, `city`, `country`, `note`
- Konum: `lat`, `lng`, `geocode_provider`, `geocode_display_name`
- Moderasyon: `status`, `rejection_reason`, `approved_by`, `approved_at`
- Zaman: `created_at`, `updated_at`

Constraint'ler:
- `status in ('pending','approved','rejected')`
- ad/sehir/ulke/not uzunluk kontrolleri
- lat/lng aralik kontrolleri

Index'ler:
- `event_pins_public_idx (event_key, status, created_at desc)`
- `event_pins_user_idx (user_id, event_key, created_at desc)`

Trigger:
- `set_updated_at` fonksiyonu ile update'lerde `updated_at` otomatik guncellenir.

### 6.3 `geocode_cache`
Alanlar:
- `provider`, `query_key`, `city`, `country`, `lat`, `lng`, `display_name`, `raw`, `expires_at`, `created_at`

Durum:
- Tablo, unique key ve indexler schema'da tanimli.
- Uygulama kodunda aktif cache okuma/yazma akisi henuz yok (gelecek genisletme alani).

## 7. Yetkilendirme ve Guvenlik

### 7.1 Supabase RLS
`event_pins` policy'leri:
- Public (`anon`, `authenticated`) -> sadece `approved` pinleri okuyabilir.
- Authenticated user -> kendi pinlerini okuyabilir.
- Authenticated user -> sadece kendi `pending` pinini insert/update edebilir.
- Admin (`is_admin(auth.uid())`) -> tum pinleri okuyup update edebilir.

`geocode_cache` policy:
- Sadece admin okuyabilir.

### 7.2 Uygulama Katmani Notu
- Admin UI ve admin route handler'larinda uygulama seviyesinde session/admin guard su anda acikca kodlanmamis.
- Buna ragmen, DB tarafindaki RLS policy'leri service-role kullanilmadigi senaryoda koruma saglar.
- Mevcut kodda admin route'lari `service_role` client kullandigi icin RLS bypass olur; bu nedenle route seviyesinde explicit admin kontrolu eklenmesi onemli bir iyilestirme alanidir.

### 7.3 XSS ve Input
- Globe tooltip HTML olustururken `escapeHtml` kullaniliyor.
- Geocode endpoint input'u temizliyor ve minimum uzunluk validation uyguluyor.
- Note alani UI'da `maxLength=240`; DB'de de constraint var.

## 8. Geocoding Mimarisi
Dosyalar:
- `lib/geocoding/index.ts`
- `lib/geocoding/geocoder.ts`
- `lib/geocoding/nominatim.ts`
- `lib/geocoding/google.ts`

Provider secimi:
- `GEOCODER_PROVIDER=google` ise Google provider
- Diger tum durumlarda Nominatim

### 8.1 Nominatim
- Endpoint: `https://nominatim.openstreetmap.org/search`
- Header'lar:
  - `User-Agent` (env veya fallback)
  - `Referer` (request origin veya site URL)
  - opsiyonel `From`
- 403 durumunda acik hata mesaji uretilir.

### 8.2 Google Geocoding
- Feature flag: `ENABLE_GOOGLE_GEOCODING=true` olmalidir.
- API key zorunlu: `GOOGLE_GEOCODING_API_KEY`
- Google response `status` kontrol edilir; `OK` disinda hata firlatilir.

### 8.3 Yardimci Normalizasyon
- `lib/geocoding/normalize.ts` icinde query normalize helper'lari var.
- Mevcut kodda aktif kullanilmiyor.

## 9. Frontend ve UI Davranisi
- Tek sayfa deneyimi: globe + hero overlay + pin count + modal.
- Body seviyesinde `overflow-hidden`; sayfa kaydirmasi kapali.
- Tailwind v4 + CSS degiskenleri ile koyu tema.
- Globe arkaplanda gece dokusu; atmosfer efekti acik.
- Mobil/desktop responsive yapida temel layout korunuyor.

## 10. Konfigurasyon ve Ortam Degiskenleri
Dosya: `.env.example`

Gerekli degiskenler:
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEOCODER_PROVIDER` (`nominatim`/`google`)
- `NOMINATIM_USER_AGENT`
- `NOMINATIM_FROM_EMAIL` (opsiyonel ama tavsiye)
- `GOOGLE_GEOCODING_API_KEY`
- `ENABLE_GOOGLE_GEOCODING`

## 11. Build, Calistirma ve Deploy

### 11.1 Local
- `npm install`
- `npm run dev`

Varsayilan adres:
- `http://localhost:3000`

### 11.2 Script'ler
- `npm run dev`
- `npm run build` (`next build --webpack`)
- `npm run start`
- `npm run lint`

### 11.3 Docker
Dosya: `Dockerfile`
- Multi-stage build (`deps` -> `builder` -> `runner`)
- `next build` sonucu `standalone` output runner image'e kopyalanir.
- Runtime:
  - `PORT=3000`
  - `HOSTNAME=0.0.0.0`
- Healthcheck:
  - `GET http://127.0.0.1:3000/api/health`

### 11.4 Coolify
README'deki hedef ayarlar:
- Build pack: Dockerfile
- Port: 3000
- Health path: `/api/health`

## 12. Kod Kalitesi ve Tooling
- TypeScript strict mode aktif (`tsconfig.json`)
- ESLint config:
  - `core-web-vitals`
  - `next/typescript`
- Path alias:
  - `@/* -> ./*`

## 13. Bilinen Bosluklar ve Teknik Borc
1. Admin route seviyesinde kimlik/rol dogrulamasi eksik.
2. `geocode_cache` tablosu schema'da var, uygulama kodunda aktif degil.
3. `normalize.ts` helper'lari su an kullanilmiyor.
4. `event_key` su an kodda sabit default (`19-mayis-2026`), coklu etkinlik yonetimi icin konfigurasyonlastirma gerekebilir.
5. Admin aksiyonlarinda `approved_by` ve `rejection_reason` henuz set edilmiyor.

## 14. Onerilen Sonraki Iyilestirmeler
1. Admin endpoint'lerine server-side session + `is_admin` kontrolu eklenmesi.
2. Geocode cache'in `query_key` bazli aktif kullanima alinmasi (maliyet/latency iyilestirmesi).
3. Moderasyon log alanlarinin (`approved_by`, `rejection_reason`) route katmaninda doldurulmasi.
4. `event_key`'in ortam degiskeni veya admin panelinden yonetilebilir hale getirilmesi.
5. E2E testler (login, geocode, pin submit, approve/reject) eklenmesi.

## 15. Dosya Referans Haritasi
- Ana sayfa: `app/page.tsx`
- Root layout: `app/layout.tsx`
- Globe render: `components/globe/PremiumGlobe.tsx`
- Login butonu: `components/auth/LoginButton.tsx`
- Pin launcher/modal: `components/pins/PinLauncher.tsx`, `components/pins/PinFormModal.tsx`
- Auth callback: `app/auth/callback/page.tsx`
- Geocode API: `app/api/geocode/route.ts`
- Admin API: `app/api/admin/pins/[id]/approve/route.ts`, `app/api/admin/pins/[id]/reject/route.ts`
- Admin sayfasi: `app/admin/pins/page.tsx`
- Health endpoint: `app/api/health/route.ts`
- Supabase browser/service client: `lib/supabase/browser.ts`, `lib/supabase/service.ts`
- Pin data fetch: `lib/pins.ts`
- Geocoder providerlari: `lib/geocoding/*.ts`
- DB schema ve policy: `supabase/schema.sql`
- Deploy config: `next.config.ts`, `Dockerfile`
