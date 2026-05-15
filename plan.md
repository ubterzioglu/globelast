# 19 Mayıs Premium Globe Pinleme Sistemi

**Doküman tipi:** Low-code / clean-code / E2E uygulama dokümanı  
**Hedef:** Google ile giriş yapan kullanıcıların form yardımıyla ülke, şehir ve kısa not girerek premium görünümlü 3D globe üzerinde doğru yerde pinlenmesi  
**Kritik karar:** Kullanıcı globe üzerinde tıklayıp pin seçmeyecek. Kullanıcı form dolduracak, sistem koordinatı bulacak, kullanıcı adayı onaylayacak, pin kaydedilecek.  
**Bu dokümanın amacı:** 5. denemede çalışan, sade, bozulması zor, agent/Codex tarafından küçük adımlarla uygulanabilir bir sistem kurmak.

---

## 0. En Net Karar

Bu projede başarı kriteri şudur:

> Kullanıcı doğru şehri seçsin, kısa not yazsın, pin globe üzerinde doğru şehir/ülke civarında görünsün.

Bu yüzden sistemi şu şekilde kuruyoruz:

```text
Globe görüntüsü: react-globe.gl
Auth: Supabase Google Auth
Database: Supabase Postgres
Pin verisi: Supabase event_pins tablosu
Geocoding: Öncelik OSM/Nominatim, opsiyonel provider mimarisi
Google API: Kod mimarisinde opsiyonel provider olarak desteklenebilir ama ana yol değildir
Pinleme şekli: Form + geocode + kullanıcı onayı
Moderasyon: pending -> approved -> public görünür
```

---

## 1. Neden Önceki Denemeler Patladı?

Muhtemel nedenler:

1. **Google Places ile harita/globe çözülmeye çalışıldı.**  
   Places bir globe/render motoru değildir. Yer önerisi ve yer detayı verir.

2. **Kullanıcıya haritada/globe üzerinde tıklatmaya çalışıldı.**  
   Bu UX olarak zor, teknik olarak hata üretmeye açık, mobilde daha da sıkıntılıdır.

3. **Globe, geocoding, auth, pin insert ve UI aynı anda yazılmaya çalışıldı.**  
   Agent bir noktadan sonra koordinat, auth session, RLS ve görsel katmanı karıştırır.

4. **Koordinat doğrulama adımı yoktu.**  
   Kullanıcı “Berlin” yazınca sistem ilk sonucu direkt kaydederse yanlış Berlin, yanlış ülke veya belirsiz yer seçilebilir.

5. **SSR/WebGL problemi gözden kaçmış olabilir.**  
   `react-globe.gl` browser/WebGL tabanlıdır. Next.js içinde direkt server render edilirse `window is not defined`, hydration veya boş ekran sorunları çıkarabilir.

6. **RLS veya service role yanlış yerde kullanılmış olabilir.**  
   Supabase `service_role` asla frontend tarafında olmamalı. RLS doğru yazılmazsa insert/select çalışmaz.

Bu doküman bu riskleri tek tek kilitler.

---

## 2. Google API Kararı: Dikkatli Kullanım

Senin dediğin şey mantıklı:

> “Google API desteği olabilir ama kullanıcı tıklayıp pinlemeyecek. Formla doğru yerde gözüksün yeter.”

Teknik olarak Google Geocoding API, adresi veya place ID bilgisini lat/lng koordinatına çevirebilir. Google Places Autocomplete de kullanıcı yazarken şehir/adres önerileri verebilir.

Ancak önemli not:

- Google Maps Platform şartlarında bazı Google Maps/Places içeriklerinin Google olmayan harita/globe ile birlikte kullanımına sınırlamalar vardır.
- Bu yüzden bu dokümanda **çalışan ana yol** olarak Google dışı geocoding kullanılır.
- Google desteği, kodda **provider abstraction** olarak bırakılır.
- Google kullanımı gerekiyorsa şartlar ayrıca kontrol edilmeli veya Google Maps tabanlı bir preview/akışa dönülmelidir.

Pratik karar:

```text
Varsayılan provider: Nominatim/OpenStreetMap
Opsiyonel provider interface: Google Geocoding / Google Places sonra eklenebilir
Kullanıcı deneyimi: Her provider aynı sonucu döner: candidate listesi
Frontend Google'a özel hale getirilmez
```

---

## 3. Kullanıcı Deneyimi

### 3.1 Public sayfa

Kullanıcı sayfayı açınca:

1. Koyu uzay arka planlı premium globe görünür.
2. Dünya yavaş döner.
3. Onaylı pinler kırmızı-beyaz glowing marker olarak görünür.
4. Pin hover/tap ile mini tooltip görünür.
5. Pin click ile not kartı açılır.
6. Sağ üstte veya hero panelinde `Kendini Pinle` butonu olur.
7. Alt/yan panelde sayaç olur: `Bugün 127 kişi kendini pinledi`.

### 3.2 Pin ekleme akışı

1. Kullanıcı `Kendini Pinle` butonuna basar.
2. Login yoksa Google login açılır.
3. Login sonrası form açılır.
4. Form alanları:
   - Görünen ad
   - Ülke
   - Şehir
   - Kısa not
5. Kullanıcı `Konumu Bul` butonuna basar.
6. Backend geocoding yapar.
7. Sistem 1-5 aday döner.
8. Kullanıcı adaylardan birini seçer.
9. Küçük önizleme gösterilir:
   - Berlin, Germany
   - Lat/Lng
   - Yaklaşık konum uyarısı
10. Kullanıcı `Pinimi Gönder` der.
11. Pin `pending` olarak kaydedilir.
12. Kullanıcıya mesaj gösterilir:

```text
Pin gönderildi. Kısa kontrolden sonra globe üzerinde görünecek.
```

### 3.3 Admin akışı

1. Admin `/admin/pins` sayfasına gider.
2. Pending pinleri görür.
3. Not uygunsa approve eder.
4. Uygun değilse reject eder.
5. Public globe sadece `approved` pinleri gösterir.

---

## 4. Low-Code Clean-Code Prensipleri

Bu projede minimum hareketli parça kullanılacak.

### 4.1 Yapılacaklar

```text
Tek globe component
Tek pin form modal
Tek geocode API route
Tek Supabase tablo seti
Tek admin moderation sayfası
Tek shared type dosyası
Tek repository/helper katmanı
```

### 4.2 Yapılmayacaklar

```text
Kullanıcıya globe üzerinde tıklayarak pin seçtirme yok
Google Maps render yok
MapLibre yok
Leaflet yok
Custom Three.js sahnesi yazmak yok
Realtime şart değil
Cluster şart değil
Edge Function şart değil
Aşırı animasyon yok
Çoklu event sistemi ilk fazda yok
Street-level pinleme yok
```

### 4.3 Clean-code dosya sınırları

```text
components/globe/PremiumGlobe.tsx      -> sadece globe render
components/pins/PinFormModal.tsx       -> sadece form
components/pins/PinDetailsCard.tsx     -> sadece seçilen pin kartı
lib/supabase/browser.ts                -> browser client
lib/supabase/server.ts                 -> server client/service helper
lib/geocoding/geocoder.ts              -> provider interface
lib/geocoding/nominatim.ts             -> Nominatim implementation
lib/geocoding/google.ts                -> opsiyonel Google implementation
lib/pins.ts                            -> pin query/insert helperları
types/pins.ts                          -> shared types
app/api/geocode/route.ts               -> geocode endpoint
app/admin/pins/page.tsx                -> admin moderation
```

Bir dosya 250-300 satırı geçerse bölünecek.

---

## 5. Teknoloji Stack

```text
Next.js App Router
React
TypeScript
Tailwind CSS
react-globe.gl
three
Supabase Auth
Supabase Postgres
Supabase RLS
Nominatim/OpenStreetMap geocoding
Opsiyonel Google provider abstraction
Vercel veya Coolify deployment
```

---

## 6. Kurulum Komutları

PowerShell:

```powershell
npx create-next-app@latest may19-globe --typescript --tailwind --eslint --app
cd may19-globe
npm install react-globe.gl three @supabase/supabase-js
npm install -D @types/three
```

Opsiyonel test paketleri:

```powershell
npm install -D @playwright/test vitest
npx playwright install
```

---

## 7. Environment Variables

`.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

GEOCODER_PROVIDER=nominatim
NOMINATIM_USER_AGENT=may19-globe/1.0 contact@example.com

GOOGLE_GEOCODING_API_KEY=
ENABLE_GOOGLE_GEOCODING=false
```

Production:

```env
NEXT_PUBLIC_SITE_URL=https://globe.corteqs.net
NOMINATIM_USER_AGENT=may19-globe/1.0 admin@corteqs.net
```

Kurallar:

```text
NEXT_PUBLIC_* browser tarafında görünür.
SUPABASE_SERVICE_ROLE_KEY asla browser tarafında kullanılmaz.
Google API key browser tarafına konulmaz.
Geocoding server-side route üzerinden yapılır.
.env değişince dev server yeniden başlatılır.
```

---

## 8. Supabase Auth Kurulumu

### 8.1 Supabase tarafı

Supabase Dashboard:

```text
Authentication -> Providers -> Google -> Enable
```

Google OAuth Client bilgileri girilir:

```text
Client ID
Client Secret
```

Supabase URL Configuration:

```text
Site URL:
http://localhost:3000

Redirect URLs:
http://localhost:3000/auth/callback
https://globe.corteqs.net/auth/callback
```

### 8.2 Google Cloud tarafı

Google Cloud Console:

```text
APIs & Services -> Credentials -> Create Credentials -> OAuth Client ID
Application type: Web application
```

Authorized redirect URI genellikle Supabase callback URL olur:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Supabase Google provider ekranında gösterilen callback URL esas alınmalı.

---

## 9. Database Şeması

### 9.1 Extension

```sql
create extension if not exists pgcrypto;
```

### 9.2 Admin roles tablosu

```sql
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
```

Admin kontrol helper function:

```sql
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = uid
  );
$$;
```

### 9.3 Geocode cache tablosu

```sql
create table if not exists public.geocode_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  query_key text not null,
  city text,
  country text,
  lat double precision not null,
  lng double precision not null,
  display_name text,
  raw jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),

  constraint geocode_cache_provider_check
    check (provider in ('nominatim', 'google', 'manual')),

  constraint geocode_cache_unique
    unique (provider, query_key)
);

create index if not exists geocode_cache_query_idx
on public.geocode_cache (provider, query_key);
```

Not:

```text
Nominatim için cache önerilir.
Google kullanılırsa cache süresi ve kullanım şartları ayrıca kontrol edilmelidir.
Google provider default kapalıdır.
```

### 9.4 Pin tablosu

```sql
create table if not exists public.event_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  event_key text not null default '19-mayis-2026',

  display_name text not null,
  city text not null,
  country text not null,
  note text not null,

  lat double precision not null,
  lng double precision not null,

  geocode_provider text not null default 'nominatim',
  geocode_display_name text,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  rejection_reason text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_pins_display_name_length check (char_length(display_name) between 2 and 80),
  constraint event_pins_city_length check (char_length(city) between 2 and 120),
  constraint event_pins_country_length check (char_length(country) between 2 and 120),
  constraint event_pins_note_length check (char_length(note) between 2 and 240),
  constraint event_pins_lat_range check (lat between -90 and 90),
  constraint event_pins_lng_range check (lng between -180 and 180)
);

create index if not exists event_pins_public_idx
on public.event_pins (event_key, status, created_at desc);

create index if not exists event_pins_user_idx
on public.event_pins (user_id, event_key, created_at desc);
```

### 9.5 Updated-at trigger

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger event_pins_set_updated_at
before update on public.event_pins
for each row
execute function public.set_updated_at();
```

---

## 10. RLS Policies

### 10.1 Enable RLS

```sql
alter table public.event_pins enable row level security;
alter table public.geocode_cache enable row level security;
```

### 10.2 Public approved pin select

Anon/public kullanıcılar sadece approved pinleri görebilsin:

```sql
create policy "Public can read approved event pins"
on public.event_pins
for select
to anon, authenticated
using (status = 'approved');
```

### 10.3 Kullanıcı kendi pinlerini görebilsin

```sql
create policy "Users can read own event pins"
on public.event_pins
for select
to authenticated
using (auth.uid() = user_id);
```

### 10.4 Kullanıcı kendi pending pinini ekleyebilsin

```sql
create policy "Users can insert own pending event pins"
on public.event_pins
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
);
```

### 10.5 Kullanıcı pending pinini güncelleyebilsin

```sql
create policy "Users can update own pending event pins"
on public.event_pins
for update
to authenticated
using (
  auth.uid() = user_id
  and status = 'pending'
)
with check (
  auth.uid() = user_id
  and status = 'pending'
);
```

### 10.6 Admin tüm pinleri görebilsin

```sql
create policy "Admins can read all event pins"
on public.event_pins
for select
to authenticated
using (public.is_admin(auth.uid()));
```

### 10.7 Admin approve/reject yapabilsin

```sql
create policy "Admins can update all event pins"
on public.event_pins
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
```

### 10.8 Geocode cache RLS

Cache server-side service role ile kullanılacak. Client doğrudan erişmeyecek.

```sql
create policy "Admins can read geocode cache"
on public.geocode_cache
for select
to authenticated
using (public.is_admin(auth.uid()));
```

---

## 11. Shared Types

`types/pins.ts`:

```ts
export type PinStatus = 'pending' | 'approved' | 'rejected';

export type EventPin = {
  id: string;
  user_id: string;
  event_key: string;
  display_name: string;
  city: string;
  country: string;
  note: string;
  lat: number;
  lng: number;
  geocode_provider: string;
  geocode_display_name: string | null;
  status: PinStatus;
  created_at: string;
};

export type PublicPin = Pick<
  EventPin,
  | 'id'
  | 'display_name'
  | 'city'
  | 'country'
  | 'note'
  | 'lat'
  | 'lng'
  | 'created_at'
>;

export type GeocodeCandidate = {
  provider: 'nominatim' | 'google' | 'manual';
  displayName: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  confidence?: number;
};
```

---

## 12. Supabase Client Dosyaları

### 12.1 Browser client

`lib/supabase/browser.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing public Supabase environment variables.');
}

export const supabaseBrowser = createClient(url, anonKey);
```

### 12.2 Service client

`lib/supabase/service.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing Supabase service environment variables.');
}

export const supabaseService = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
```

Kural:

```text
service.ts hiçbir client component içinde import edilmeyecek.
Sadece route handler, server action veya server-side admin işlerinde kullanılacak.
```

---

## 13. Auth Implementation

### 13.1 Login button

`components/auth/LoginButton.tsx`:

```tsx
'use client';

import { supabaseBrowser } from '@/lib/supabase/browser';

export function LoginButton() {
  const login = async () => {
    const origin = window.location.origin;

    await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={login}
      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-xl transition hover:scale-[1.02]"
    >
      Google ile giriş yap
    </button>
  );
}
```

### 13.2 Auth callback

`app/auth/callback/page.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabaseBrowser.auth.getSession().finally(() => {
      router.replace('/');
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      Giriş tamamlanıyor...
    </main>
  );
}
```

Not:

```text
Eğer PKCE/server-side auth kullanılıyorsa callback route daha gelişmiş olabilir.
MVP için browser client ile bu akış yeterlidir.
```

---

## 14. Geocoding Tasarımı

### 14.1 Neden candidate listesi?

`Berlin` yazınca tek sonuç seçmek risklidir. Bu yüzden backend 1-5 sonuç döner. Kullanıcı doğru olanı seçer.

### 14.2 Normalize helper

`lib/geocoding/normalize.ts`:

```ts
export function normalizeLocationInput(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function createQueryKey(city: string, country: string) {
  return `${normalizeLocationInput(city)}|${normalizeLocationInput(country)}`;
}
```

### 14.3 Provider interface

`lib/geocoding/geocoder.ts`:

```ts
import type { GeocodeCandidate } from '@/types/pins';

export type GeocodeInput = {
  city: string;
  country: string;
  limit?: number;
};

export type Geocoder = {
  search(input: GeocodeInput): Promise<GeocodeCandidate[]>;
};
```

### 14.4 Nominatim provider

`lib/geocoding/nominatim.ts`:

```ts
import type { GeocodeCandidate } from '@/types/pins';
import type { Geocoder, GeocodeInput } from './geocoder';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
};

function toCandidate(item: NominatimItem): GeocodeCandidate {
  const city =
    item.address?.city ??
    item.address?.town ??
    item.address?.village ??
    item.address?.municipality ??
    '';

  return {
    provider: 'nominatim',
    displayName: item.display_name,
    city,
    country: item.address?.country ?? '',
    lat: Number(item.lat),
    lng: Number(item.lon),
    confidence: item.importance,
  };
}

export function createNominatimGeocoder(): Geocoder {
  return {
    async search(input: GeocodeInput) {
      const userAgent = process.env.NOMINATIM_USER_AGENT;

      if (!userAgent) {
        throw new Error('NOMINATIM_USER_AGENT is missing.');
      }

      const params = new URLSearchParams({
        q: `${input.city}, ${input.country}`,
        format: 'jsonv2',
        addressdetails: '1',
        limit: String(input.limit ?? 5),
      });

      const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        headers: {
          'User-Agent': userAgent,
          Referer: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim failed with status ${response.status}.`);
      }

      const data = (await response.json()) as NominatimItem[];

      return data
        .map(toCandidate)
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
    },
  };
}
```

### 14.5 Opsiyonel Google provider iskeleti

Bu provider **default kapalıdır**. Sadece şartlar netleştirilirse açılır.

`lib/geocoding/google.ts`:

```ts
import type { GeocodeCandidate } from '@/types/pins';
import type { Geocoder, GeocodeInput } from './geocoder';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

type GoogleGeocodeResult = {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: Array<{
    long_name: string;
    types: string[];
  }>;
};

type GoogleGeocodeResponse = {
  status: string;
  results: GoogleGeocodeResult[];
  error_message?: string;
};

function findComponent(result: GoogleGeocodeResult, type: string) {
  return result.address_components?.find((item) => item.types.includes(type))?.long_name ?? '';
}

export function createGoogleGeocoder(): Geocoder {
  return {
    async search(input: GeocodeInput): Promise<GeocodeCandidate[]> {
      if (process.env.ENABLE_GOOGLE_GEOCODING !== 'true') {
        throw new Error('Google geocoding is disabled.');
      }

      const key = process.env.GOOGLE_GEOCODING_API_KEY;

      if (!key) {
        throw new Error('GOOGLE_GEOCODING_API_KEY is missing.');
      }

      const params = new URLSearchParams({
        address: `${input.city}, ${input.country}`,
        key,
      });

      const response = await fetch(`${GOOGLE_GEOCODE_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Google geocoding failed with status ${response.status}.`);
      }

      const data = (await response.json()) as GoogleGeocodeResponse;

      if (data.status !== 'OK') {
        throw new Error(data.error_message ?? `Google geocoding status: ${data.status}`);
      }

      return data.results.slice(0, input.limit ?? 5).map((result) => ({
        provider: 'google',
        displayName: result.formatted_address,
        city:
          findComponent(result, 'locality') ||
          findComponent(result, 'postal_town') ||
          findComponent(result, 'administrative_area_level_2'),
        country: findComponent(result, 'country'),
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      }));
    },
  };
}
```

### 14.6 Provider seçici

`lib/geocoding/index.ts`:

```ts
import { createNominatimGeocoder } from './nominatim';
import { createGoogleGeocoder } from './google';
import type { Geocoder } from './geocoder';

export function getGeocoder(): Geocoder {
  const provider = process.env.GEOCODER_PROVIDER ?? 'nominatim';

  if (provider === 'google') {
    return createGoogleGeocoder();
  }

  return createNominatimGeocoder();
}
```

---

## 15. Geocode API Route

`app/api/geocode/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getGeocoder } from '@/lib/geocoding';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const city = clean(body.city);
    const country = clean(body.country);

    if (city.length < 2 || country.length < 2) {
      return NextResponse.json(
        { error: 'Şehir ve ülke alanları zorunludur.' },
        { status: 400 }
      );
    }

    const geocoder = getGeocoder();
    const candidates = await geocoder.search({ city, country, limit: 5 });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Konum bulunamadı. Şehir ve ülke bilgisini kontrol et.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown geocoding error';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
```

İkinci fazda bu route içine auth kontrolü ve cache eklenebilir. İlk çalışan sürüm için sade tutulur. Abuse riski varsa auth zorunlu hale getirilir.

---

## 16. Public Pin Fetch Helper

`lib/pins.ts`:

```ts
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { PublicPin } from '@/types/pins';

export async function fetchApprovedPins(eventKey = '19-mayis-2026') {
  const { data, error } = await supabaseBrowser
    .from('event_pins')
    .select('id, display_name, city, country, note, lat, lng, created_at')
    .eq('event_key', eventKey)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as PublicPin[];
}
```

---

## 17. Premium Globe Component

### 17.1 Next.js dynamic import şartı

`react-globe.gl` WebGL/browser bağımlıdır. Bu yüzden component direkt server render edilmez.

`components/globe/GlobeClient.tsx`:

```tsx
'use client';

import dynamic from 'next/dynamic';

export const GlobeClient = dynamic(() => import('./PremiumGlobe'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-white/70">
      Globe yükleniyor...
    </div>
  ),
});
```

### 17.2 PremiumGlobe

`components/globe/PremiumGlobe.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import type { PublicPin } from '@/types/pins';
import { fetchApprovedPins } from '@/lib/pins';

function createLabel(pin: PublicPin) {
  return `
    <div style="padding:10px 12px;border-radius:14px;background:rgba(0,0,0,.72);color:white;box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(12px);max-width:240px">
      <div style="font-weight:700;margin-bottom:4px">${pin.display_name}</div>
      <div style="opacity:.82;font-size:12px;margin-bottom:6px">${pin.city}, ${pin.country}</div>
      <div style="font-size:13px;line-height:1.35">${pin.note}</div>
    </div>
  `;
}

export default function PremiumGlobe() {
  const globeRef = useRef<any>(null);
  const [pins, setPins] = useState<PublicPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<PublicPin | null>(null);

  useEffect(() => {
    fetchApprovedPins()
      .then(setPins)
      .catch(() => setPins([]));
  }, []);

  useEffect(() => {
    const globe = globeRef.current;

    if (!globe) return;

    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.35;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.05;
    globe.pointOfView({ lat: 39, lng: 35, altitude: 2.2 }, 1200);
  }, []);

  const points = useMemo(
    () =>
      pins.map((pin) => ({
        ...pin,
        label: createLabel(pin),
      })),
    [pins]
  );

  return (
    <div className="relative h-[calc(100vh-0px)] w-full overflow-hidden bg-[#03040a]">
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.12)_38%,rgba(0,0,0,.76)_100%)]" />

      <Globe
        ref={globeRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
        backgroundColor="rgba(0,0,0,0)"
        backgroundImageUrl="/globe/night-sky.png"
        globeImageUrl="/globe/earth-night.jpg"
        bumpImageUrl="/globe/earth-topology.png"
        showAtmosphere
        atmosphereColor="#8cc8ff"
        atmosphereAltitude={0.22}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.055}
        pointRadius={0.22}
        pointResolution={24}
        pointColor={() => '#ff2d2d'}
        pointLabel="label"
        pointsTransitionDuration={900}
        onPointClick={(pin) => setSelectedPin(pin as PublicPin)}
      />

      <div className="pointer-events-none absolute left-6 top-6 z-20 max-w-xl rounded-3xl border border-white/10 bg-black/35 p-6 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">
          19 Mayıs Global Türk Gençlik Haritası
        </div>
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          Dünyanın neresindesin?
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/72 md:text-base">
          Google ile giriş yap, şehrini seç, kısa notunu bırak. 19 Mayıs’ta global haritada yerini al.
        </p>
      </div>

      <div className="absolute bottom-6 left-6 z-20 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 shadow-xl backdrop-blur-xl">
        <span className="font-semibold text-white">{pins.length}</span> onaylı pin yayında
      </div>

      {selectedPin ? (
        <div className="absolute bottom-6 right-6 z-30 max-w-sm rounded-3xl border border-white/10 bg-black/70 p-5 text-white shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setSelectedPin(null)}
            className="absolute right-4 top-4 text-white/60 hover:text-white"
          >
            ×
          </button>
          <div className="pr-8 text-lg font-bold">{selectedPin.display_name}</div>
          <div className="mt-1 text-sm text-white/65">
            {selectedPin.city}, {selectedPin.country}
          </div>
          <p className="mt-4 text-sm leading-6 text-white/86">{selectedPin.note}</p>
        </div>
      ) : null}
    </div>
  );
}
```

### 17.3 Asset dosyaları

Bu dosyalar eklenmeli:

```text
public/globe/earth-night.jpg
public/globe/earth-topology.png
public/globe/night-sky.png
```

Pratik ilk test için `three-globe` example assetleri kullanılabilir. Production için assetleri lokal `public/globe` içine koymak daha güvenlidir.

Önerilen görsel stil:

```text
Earth texture: night lights veya dark blue marble
Bump map: earth topology
Background: subtle stars
Atmosphere: soft blue glow
Pins: red/white glowing points
UI cards: black glassmorphism
```

---

## 18. Main Page

`app/page.tsx`:

```tsx
import { GlobeClient } from '@/components/globe/GlobeClient';
import { PinLauncher } from '@/components/pins/PinLauncher';

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black">
      <GlobeClient />
      <PinLauncher />
    </main>
  );
}
```

---

## 19. Pin Launcher

`components/pins/PinLauncher.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { LoginButton } from '@/components/auth/LoginButton';
import { PinFormModal } from './PinFormModal';

export function PinLauncher() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="absolute right-6 top-6 z-30">
      {user ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-2xl transition hover:scale-[1.02]"
          >
            Kendini Pinle
          </button>
          <PinFormModal open={open} onClose={() => setOpen(false)} user={user} />
        </>
      ) : (
        <LoginButton />
      )}
    </div>
  );
}
```

---

## 20. Pin Form Modal

`components/pins/PinFormModal.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/browser';
import type { GeocodeCandidate } from '@/types/pins';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User;
};

type FormState = {
  displayName: string;
  country: string;
  city: string;
  note: string;
};

const initialForm: FormState = {
  displayName: '',
  country: '',
  city: '',
  note: '',
};

export function PinFormModal({ open, onClose, user }: Props) {
  const [form, setForm] = useState<FormState>({
    ...initialForm,
    displayName: user.user_metadata?.full_name ?? '',
  });
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [selected, setSelected] = useState<GeocodeCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const findLocation = async () => {
    setLoading(true);
    setMessage('');
    setCandidates([]);
    setSelected(null);

    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: form.city, country: form.country }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Konum bulunamadı.');
      }

      setCandidates(data.candidates ?? []);
      setMessage('Aşağıdan doğru konumu seç.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Konum aranırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const submitPin = async () => {
    if (!selected) {
      setMessage('Önce doğru konumu seçmelisin.');
      return;
    }

    setLoading(true);
    setMessage('');

    const payload = {
      user_id: user.id,
      display_name: form.displayName.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
      note: form.note.trim(),
      lat: selected.lat,
      lng: selected.lng,
      geocode_provider: selected.provider,
      geocode_display_name: selected.displayName,
      status: 'pending',
    };

    const { error } = await supabaseBrowser.from('event_pins').insert(payload);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage('Pin gönderildi. Onaydan sonra globe üzerinde görünecek.');
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#080a12] p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Kendini Pinle</h2>
            <p className="mt-1 text-sm text-white/60">
              Şehir ve ülke bilgini yaz. Sistem doğru koordinatı bulsun.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-white/60 hover:text-white">
            ×
          </button>
        </div>

        <div className="grid gap-4">
          <input
            value={form.displayName}
            onChange={(event) => update('displayName', event.target.value)}
            placeholder="Görünen ad"
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.country}
              onChange={(event) => update('country', event.target.value)}
              placeholder="Ülke, örn. Germany"
              className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
            />
            <input
              value={form.city}
              onChange={(event) => update('city', event.target.value)}
              placeholder="Şehir, örn. Dortmund"
              className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
            />
          </div>
          <textarea
            value={form.note}
            onChange={(event) => update('note', event.target.value)}
            placeholder="Kısa notun. Maksimum 240 karakter."
            maxLength={240}
            rows={4}
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 outline-none ring-white/20 focus:ring-2"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={findLocation}
            disabled={loading}
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            Konumu Bul
          </button>
          <button
            type="button"
            onClick={submitPin}
            disabled={loading || !selected}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Pinimi Gönder
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-white/75">{message}</p> : null}

        {candidates.length > 0 ? (
          <div className="mt-5 grid gap-2">
            {candidates.map((candidate) => (
              <button
                type="button"
                key={`${candidate.provider}-${candidate.lat}-${candidate.lng}`}
                onClick={() => setSelected(candidate)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selected === candidate
                    ? 'border-red-400 bg-red-500/18'
                    : 'border-white/10 bg-white/6 hover:bg-white/10'
                }`}
              >
                <div className="font-semibold">{candidate.displayName}</div>
                <div className="mt-1 text-xs text-white/55">
                  {candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)} · {candidate.provider}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

---

## 21. Admin Moderation Sayfası

Bu sayfa ilk MVP için sade olabilir.

`app/admin/pins/page.tsx`:

```tsx
import { supabaseService } from '@/lib/supabase/service';

async function getPendingPins() {
  const { data, error } = await supabaseService
    .from('event_pins')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export default async function AdminPinsPage() {
  const pins = await getPendingPins();

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <h1 className="text-3xl font-bold">Pending Pins</h1>
      <div className="mt-8 grid gap-4">
        {pins.map((pin) => (
          <div key={pin.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="font-bold">{pin.display_name}</div>
            <div className="text-sm text-white/60">
              {pin.city}, {pin.country} · {pin.lat}, {pin.lng}
            </div>
            <p className="mt-3 text-sm">{pin.note}</p>
            <div className="mt-4 flex gap-3">
              <form action={`/api/admin/pins/${pin.id}/approve`} method="post">
                <button className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold">
                  Approve
                </button>
              </form>
              <form action={`/api/admin/pins/${pin.id}/reject`} method="post">
                <button className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold">
                  Reject
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
```

Not:

```text
Bu admin sayfası production için auth guard ister.
İlk implementationda hızlı test için yazılır.
Sonra middleware veya server-side admin check eklenir.
```

---

## 22. Admin API Routes

### 22.1 Approve

`app/api/admin/pins/[id]/approve/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;

  const { error } = await supabaseService
    .from('event_pins')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL('/admin/pins', _request.url));
}
```

### 22.2 Reject

`app/api/admin/pins/[id]/reject/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase/service';

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;

  const { error } = await supabaseService
    .from('event_pins')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL('/admin/pins', _request.url));
}
```

Production hardening:

```text
Bu route'lara admin session check eklenecek.
Şimdilik service role kullanımı sadece server-side olduğu için client'a sızmaz.
```

---

## 23. Premium Görünüm Tasarım Reçetesi

### 23.1 Renkler

```text
Background: #03040a
Card black: rgba(0,0,0,.55)
Text primary: #ffffff
Text secondary: rgba(255,255,255,.7)
Pin red: #ff2d2d
Pin white glow: rgba(255,255,255,.8)
Atmosphere: #8cc8ff
Accent: Turkish red + white
```

### 23.2 UI öğeleri

```text
Hero card: sol üst, glassmorphism
Pin button: sağ üst, beyaz pill button
Counter: sol alt
Selected pin card: sağ alt
Mobile: hero compact, button fixed bottom
```

### 23.3 Globe animasyonları

```text
Auto rotate speed: 0.25 - 0.45
Initial POV: Türkiye merkezli, altitude 2.1 - 2.4
Atmosphere altitude: 0.18 - 0.25
Point altitude: 0.04 - 0.07
Point radius: 0.18 - 0.28
Transition: 700 - 1000ms
```

### 23.4 Mobil davranış

```text
Hero card küçülür
Pin button bottom center olur
Selected card bottom sheet gibi davranır
Globe drag açık kalır
Text tooltip mobilde gereksizse sadece click card gösterilir
```

---

## 24. Ana Uygulama Akış Diagramı

```text
User opens page
  -> Next.js renders HomePage
  -> GlobeClient loads client-side only
  -> PremiumGlobe fetches approved pins from Supabase
  -> react-globe.gl renders pointsData

User clicks Kendini Pinle
  -> if not logged in: Supabase Google OAuth
  -> if logged in: PinFormModal opens
  -> user enters country + city + note
  -> POST /api/geocode
  -> provider returns candidates
  -> user selects candidate
  -> insert event_pins status=pending via Supabase client
  -> admin approves
  -> public globe fetch includes new pin
```

---

## 25. Codex / Agent İçin Küçük Todo Paketleri

Bu paketler sırayla uygulanacak. Bir paket bitmeden diğerine geçilmeyecek.

### Paket 01 — Proje bağımlılıkları

```text
Amaç:
Next.js projesinde gerekli paketleri kur.

Yap:
- react-globe.gl kur
- three kur
- @supabase/supabase-js kur
- @types/three kur

Done:
- npm run build dependency yüzünden patlamıyor
```

### Paket 02 — Environment kontrolü

```text
Amaç:
.env.local değişkenlerini hazırla.

Yap:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- GEOCODER_PROVIDER=nominatim
- NOMINATIM_USER_AGENT

Done:
- Eksik env varsa uygulama anlamlı hata veriyor
```

### Paket 03 — Supabase SQL

```text
Amaç:
Database şemasını oluştur.

Yap:
- admin_users tablosu
- is_admin function
- geocode_cache tablosu
- event_pins tablosu
- indexes
- updated_at trigger
- RLS policies

Done:
- SQL Supabase SQL editor'da hatasız çalışıyor
```

### Paket 04 — Supabase clients

```text
Amaç:
Browser ve service clientları ayır.

Yap:
- lib/supabase/browser.ts
- lib/supabase/service.ts

Done:
- service client hiçbir client component içinde import edilmiyor
```

### Paket 05 — Google OAuth login

```text
Amaç:
Google ile giriş çalışsın.

Yap:
- LoginButton component
- /auth/callback page
- Supabase redirect URL kontrolü

Done:
- Localhost'ta Google login sonrası ana sayfaya dönüyor
```

### Paket 06 — Geocoding interface

```text
Amaç:
Provider bağımsız geocoding altyapısı kur.

Yap:
- types/pins.ts
- lib/geocoding/geocoder.ts
- normalize helper

Done:
- TypeScript build geçiyor
```

### Paket 07 — Nominatim provider

```text
Amaç:
Şehir + ülke -> candidate listesi dön.

Yap:
- createNominatimGeocoder
- /api/geocode POST route

Done:
- Dortmund + Germany arayınca lat/lng candidate dönüyor
```

### Paket 08 — Globe client-only render

```text
Amaç:
Boş ekran/SSR hatası olmadan globe render et.

Yap:
- GlobeClient dynamic import ssr:false
- PremiumGlobe base render
- public/globe assetleri

Done:
- Ana sayfada premium globe görünüyor
```

### Paket 09 — Public pins fetch

```text
Amaç:
Approved pinleri globe üzerinde göster.

Yap:
- fetchApprovedPins helper
- pointsData mapping
- tooltip label
- click selected card

Done:
- Supabase'de approved test row varsa globe üzerinde pin görünüyor
```

### Paket 10 — Pin launcher

```text
Amaç:
Login durumuna göre button/modal göster.

Yap:
- PinLauncher
- auth state listener

Done:
- Login yoksa Google button
- Login varsa Kendini Pinle button
```

### Paket 11 — Pin form

```text
Amaç:
Formdan geocode edip candidate seçtir.

Yap:
- PinFormModal
- Konumu Bul
- Candidate listesi
- Candidate seçimi

Done:
- Kullanıcı Dortmund/Germany için doğru candidate seçebiliyor
```

### Paket 12 — Pin insert

```text
Amaç:
Seçilen candidate ile pending pin oluştur.

Yap:
- Supabase insert
- user_id auth user id
- status pending

Done:
- Pin event_pins tablosuna pending olarak yazılıyor
```

### Paket 13 — Admin moderation

```text
Amaç:
Pending pinleri approve/reject et.

Yap:
- /admin/pins sayfası
- approve route
- reject route

Done:
- Pending pin approved yapılınca public globe üzerinde görünüyor
```

### Paket 14 — Premium polish

```text
Amaç:
Görsel kaliteyi yükselt.

Yap:
- Night sky background
- Earth night texture
- Atmosphere glow
- Glassmorphism cards
- Counter
- Mobile layout

Done:
- Sayfa screenshot'ta premium launch page gibi görünüyor
```

### Paket 15 — Error states

```text
Amaç:
Kullanıcı bozuk durumda kalmasın.

Yap:
- Geocode hata mesajı
- Empty pins state
- Missing env error
- Loading state

Done:
- API hata verirse kullanıcı net mesaj görüyor
```

### Paket 16 — Smoke test

```text
Amaç:
E2E akışı doğrula.

Yap:
- Login
- Form aç
- Şehir/ülke gir
- Konumu bul
- Candidate seç
- Pin gönder
- Admin approve
- Globe üzerinde gör

Done:
- Akış baştan sona manuel olarak çalışıyor
```

---

## 26. Test Senaryoları

### 26.1 Manuel test

```text
1. Site açılıyor mu?
2. Globe görünüyor mu?
3. Console'da window/SSR hatası var mı?
4. Approved test pin görünüyor mu?
5. Google login çalışıyor mu?
6. Pin form açılıyor mu?
7. Dortmund + Germany konum buluyor mu?
8. Candidate seçilebiliyor mu?
9. Pin pending kaydediliyor mu?
10. Admin approve sonrası pin public görünüyor mu?
```

### 26.2 Yanlış giriş testleri

```text
City boş -> hata
Country boş -> hata
Note 240 karakter üstü -> client engeller, DB de engeller
Lat/Lng NaN -> insert olmaz
Anon insert -> RLS engeller
Pending pin public görünmez
Rejected pin public görünmez
```

### 26.3 Teknik hata testleri

```text
NOMINATIM_USER_AGENT yok -> anlamlı server hatası
Supabase URL yok -> anlamlı env hatası
Globe asset yok -> globe siyah kalabilir ama app çökmez
RLS yanlış -> insert/select hata mesajı görünür
```

---

## 27. Troubleshooting

### 27.1 Globe hiç görünmüyor

Kontrol:

```text
Component dynamic import ile ssr:false mı?
Parent container height var mı?
public/globe asset pathleri doğru mu?
Browser console'da WebGL hatası var mı?
```

Çözüm:

```text
GlobeClient kullan.
Ana container'a min-h-screen veya h-screen ver.
```

### 27.2 `window is not defined`

Sebep:

```text
react-globe.gl server tarafında render edilmeye çalışılıyor.
```

Çözüm:

```text
dynamic import + ssr:false kullan.
```

### 27.3 Pin yanlış yerde çıkıyor

Kontrol:

```text
lat/lng ters mi?
Nominatim lon alanı lng olarak maplendi mi?
String number'a çevrildi mi?
Yanlış candidate mi seçildi?
```

Çözüm:

```text
lat = Number(item.lat)
lng = Number(item.lon)
Candidate confirmation zorunlu olsun.
```

### 27.4 Google login dönmüyor

Kontrol:

```text
Supabase Site URL doğru mu?
Redirect URLs içinde /auth/callback var mı?
Google OAuth Authorized redirect URI Supabase callback URL mi?
Production domain eklendi mi?
```

### 27.5 Supabase insert RLS hatası

Kontrol:

```text
user_id auth.uid() ile aynı mı?
status pending mi?
Kullanıcı gerçekten authenticated mı?
RLS insert policy var mı?
```

### 27.6 Nominatim 403/429

Sebep:

```text
User-Agent yoktur.
Çok sık istek atılıyordur.
Cache yoktur.
Public servis sınıra takılmıştır.
```

Çözüm:

```text
Server-side proxy kullan.
User-Agent tanımla.
Cache ekle.
İstekleri debounce et.
Alternatif geocoding provider'a geç.
```

### 27.7 Pin onaylandı ama görünmüyor

Kontrol:

```text
status gerçekten approved mu?
event_key aynı mı?
fetchApprovedPins doğru event_key ile çağrılıyor mu?
RLS select policy approved pinleri anon/auth için açıyor mu?
```

---

## 28. Production Hardening

İlk çalışan sürümden sonra yapılacaklar:

```text
/api/geocode auth zorunlu olsun
Geocode cache aktif olsun
Rate limit eklensin
Admin route'lara gerçek admin session guard eklensin
Pin submit server-side route'a taşınsın
Profanity/spam filter eklensin
Duplicate pin kontrolü eklensin
Aynı kullanıcı aynı event için maksimum 1 approved/pending pin oluşturabilsin
```

Duplicate constraint opsiyonu:

```sql
create unique index if not exists event_pins_one_active_per_user_event
on public.event_pins (user_id, event_key)
where status in ('pending', 'approved');
```

Bu eklenirse bir kullanıcı aynı event için ikinci pin oluşturamaz.

---

## 29. Geocode Cache İkinci Faz

İlk fazda doğrudan API çağrısı yeterli. İkinci fazda:

```text
1. query_key oluştur
2. geocode_cache içinde ara
3. varsa sonucu dön
4. yoksa provider çağır
5. sonucu cachele
6. candidate dön
```

Cache pseudo-flow:

```ts
const queryKey = createQueryKey(city, country);

const cached = await findCache(provider, queryKey);
if (cached) return [cached];

const candidates = await provider.search({ city, country });
await saveBestCandidates(provider, queryKey, candidates);
return candidates;
```

---

## 30. Güvenlik Notları

```text
service_role frontend'e konulmaz
Google API key frontend'e konulmaz
RLS açık kalır
Anon sadece approved pinleri görür
Authenticated kullanıcı sadece kendi pinini insert/update eder
Admin listesi admin_users tablosundan yönetilir
Not alanı max 240 karakterdir
HTML injection riskine karşı not render ederken React text olarak basılır
Tooltip HTML kullanılıyorsa içerik sanitize edilmeli veya basit text kullanılmalı
```

Önemli:

```text
Yukarıdaki PremiumGlobe createLabel fonksiyonu HTML string üretir.
Production için kullanıcı notunu HTML içine raw basmak yerine escape helper kullanılmalı.
```

Escape helper:

```ts
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

---

## 31. Performans Notları

```text
İlk hedef: 0-1000 pin sorunsuz
pointsData yeterli
Pinler çok artarsa pointsMerge düşünülebilir ama click/hover etkilenebilir
Realtime kapalı kalsın
Approved pins polling yerine page load fetch yeterli
Mobile için pointRadius biraz büyütülebilir
```

Pin sayısı artarsa:

```text
0-1000: pointsData normal
1000-5000: pointsMerge veya sampling düşün
5000+: heatmap/hex layer veya server-side aggregation düşün
```

---

## 32. Deployment Checklist

### 32.1 Vercel

```powershell
npm run build
```

Vercel env variables:

```text
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEOCODER_PROVIDER
NOMINATIM_USER_AGENT
```

### 32.2 Supabase

```text
Google provider enabled
Site URL production domain
Redirect URL production /auth/callback
RLS policies active
Admin user inserted into admin_users
```

Admin user ekleme:

```sql
insert into public.admin_users (user_id)
values ('YOUR_AUTH_USER_UUID')
on conflict (user_id) do nothing;
```

### 32.3 Smoke test production

```text
Production sayfa açılıyor
Globe görünüyor
Login çalışıyor
Form açılıyor
Geocode çalışıyor
Pending insert oluyor
Admin approve ediyor
Approved pin public görünüyor
```

---

## 33. Agent'a Verilecek Tek Parça Prompt

Aşağıdaki prompt doğrudan Codex/agent'a verilebilir:

```text
Bu projede 19 Mayıs için premium görünümlü 3D globe pinleme sistemi kuracağız.

Kritik kararlar:
- Kullanıcı globe üzerinde tıklayarak pin seçmeyecek.
- Kullanıcı Google ile login olacak.
- Kullanıcı formda displayName, country, city, note girecek.
- Sistem /api/geocode üzerinden şehir+ülke bilgisini koordinata çevirecek.
- Kullanıcı geocode candidate listesinden doğru sonucu seçecek.
- Pin Supabase event_pins tablosuna status=pending olarak yazılacak.
- Admin onaylayınca status=approved olacak.
- Public globe sadece approved pinleri gösterecek.
- Globe için react-globe.gl kullanılacak.
- Globe client-only dynamic import ile yüklenecek, ssr:false olacak.
- Supabase service role sadece server-side dosyalarda kullanılacak.
- Default geocoding provider nominatim olacak.
- Google provider interface opsiyonel kalacak ve default kapalı olacak.

Lütfen implementation'ı küçük paketler halinde yap:
1. Dependencies
2. Env validation
3. Supabase clients
4. Types
5. Geocoding provider
6. /api/geocode
7. Globe client-only render
8. Approved pins fetch
9. Auth button
10. Pin form modal
11. Pending insert
12. Admin moderation
13. Premium UI polish

Önce çalışan minimal flow'u kur. Sonra görsel polish yap. Gereksiz feature ekleme. Click-to-pin, Google Maps render, MapLibre, Leaflet, custom Three.js sahnesi, realtime, clustering ve multi-event özelliklerini ekleme.
```

---

## 34. İlk Çalışan Sürüm İçin Kabul Kriterleri

```text
[ ] Ana sayfada premium globe görünüyor
[ ] Globe otomatik yavaş dönüyor
[ ] Approved pinler globe üzerinde görünüyor
[ ] Pin tooltip/card gösteriyor
[ ] Google login çalışıyor
[ ] Login sonrası Kendini Pinle butonu görünüyor
[ ] Form şehir/ülke/not alıyor
[ ] Konumu Bul candidate listesi getiriyor
[ ] Kullanıcı candidate seçebiliyor
[ ] Pin pending olarak Supabase'e yazılıyor
[ ] Admin pending pinleri görebiliyor
[ ] Admin approve edebiliyor
[ ] Approved pin refresh sonrası public globe üzerinde görünüyor
[ ] Build hatasız geçiyor
[ ] Mobile görünüm kullanılabilir durumda
```

---

## 35. Kaynak Notları

Bu dokümandaki teknik kararlar şu resmi/güvenilir dokümanlara göre hazırlanmıştır:

```text
react-globe.gl: ThreeJS/WebGL tabanlı React globe component, pointsData, pointLat, pointLng, pointLabel, pointClick destekler.
Supabase Auth: Google OAuth signInWithOAuth ve redirectTo akışı destekler.
Supabase RLS: Supabase Auth ile RLS policy yazılabilir.
Nominatim: Textual location search destekler, public servis için User-Agent/Referer, cache ve düşük kullanım gerekir.
Google Geocoding API: Address/place ID -> latitude/longitude dönüşümü yapar.
Google Places Autocomplete: Kullanıcı input'u için prediction/candidate akışı sağlar.
Next.js dynamic import: Browser API kullanan componentler için ssr:false destekler.
NASA Blue Marble/media: Earth texture için NASA kaynaklı görseller kullanılabilir; yine de asset lisansı production öncesi kontrol edilmelidir.
```

---

## 36. Final Öneri

Bu proje için en güvenli çalışan rota:

```text
1. Google login'i Supabase ile çöz.
2. Globe'u react-globe.gl ile client-only render et.
3. Şehir/ülke formunu aç.
4. Nominatim ile candidate getir.
5. Kullanıcıya doğru candidate'i seçtir.
6. Pending pin olarak kaydet.
7. Admin approve sonrası globe'a bas.
```

Bu rota hem düşük kodlu, hem temiz, hem de 19 Mayıs gibi tarih odaklı bir kampanya için yeterince sağlamdır.
