# 19 Mayıs Premium Globe — Pin Types, Emoji System, Premium Popup & Abuse Prevention

Bu doküman, mevcut **19 Mayıs Premium Globe** E2E dokümanına eklenmek üzere hazırlanmıştır.

Amaç:

- Globe üzerinde farklı pin türleri göstermek
- Pinleri emoji kimliğiyle daha anlamlı hale getirmek
- Globe’un premium görünümünü bozmadan canlı bir deneyim sunmak
- Pin’e tıklandığında güzel ve modern bir detay kartı göstermek
- Sürekli pin ekleme, spam ve kötüye kullanımı azaltmak
- Veri güvenliği ve kullanıcı gizliliğini ilk versiyondan itibaren korumak

---

## 1. Ana Tasarım Kararı

Globe üzerinde pinler **büyük emoji olarak görünmeyecek**.

Bunun yerine:

- Globe yüzeyinde küçük, premium, glow efektli noktalar gösterilecek.
- Pin rengi `pin_type` değerine göre değişecek.
- Emoji; formda, filtrelerde, tooltip içinde, popup/modal içinde ve istatistik kartlarında kullanılacak.
- Böylece globe bir “emoji panosu” gibi görünmeyecek.
- Premium, sade ve modern görünüm korunacak.

Özet karar:

```text
Globe premium kalacak.
Pinler renkli glowing point olacak.
Emoji kimliği popup, form ve filtrede yaşayacak.
Kullanıcı bir event için sadece 1 pin ekleyebilecek.
Yeni pin ve değişiklikler önce pending olacak.
Public tarafta sadece approved pinler görünecek.
Notlar kısa, linksiz ve HTMLsiz olacak.
```

---

## 2. MVP Pin Türleri

İlk versiyonda sadece aşağıdaki 5 pin türü kullanılacak.

Daha fazla pin türü eklenmeyecek. Fazla seçenek kullanıcıyı yorar ve arayüzü karmaşıklaştırır.

| Pin Type | Emoji | Label | Kullanım Amacı |
|---|---:|---|---|
| `greeting` | 🇹🇷 | 19 Mayıs Selamı | Varsayılan genel 19 Mayıs selamı |
| `student` | 🎓 | Öğrenci | Öğrenciler ve gençler |
| `event` | 📍 | Etkinlik | Fiziksel/dijital etkinlik veya buluşma noktası |
| `family` | 🏠 | Aileden Selam | Aile olarak veya evden gönderilen selamlar |
| `general` | 🌍 | Genel | Diğer tüm genel katılım mesajları |

---

## 3. Frontend Pin Type Config

Aşağıdaki config frontend tarafında tek kaynak olarak kullanılacak.

Önerilen dosya:

```text
src/config/pinTypes.ts
```

İçerik:

```ts
export const PIN_TYPES = {
  greeting: {
    emoji: "🇹🇷",
    label: "19 Mayıs Selamı",
    shortLabel: "Selam",
    description:
      "Dünyanın herhangi bir yerinden 19 Mayıs selamı göndermek isteyenler için.",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.65)",
  },

  student: {
    emoji: "🎓",
    label: "Öğrenci",
    shortLabel: "Öğrenci",
    description:
      "Öğrenciler, gençler ve eğitim hayatındaki katılımcılar için.",
    color: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.65)",
  },

  event: {
    emoji: "📍",
    label: "Etkinlik",
    shortLabel: "Etkinlik",
    description:
      "19 Mayıs için şehir bazlı buluşma, kutlama veya etkinlik noktaları için.",
    color: "#facc15",
    glow: "rgba(250, 204, 21, 0.65)",
  },

  family: {
    emoji: "🏠",
    label: "Aileden Selam",
    shortLabel: "Aile",
    description:
      "Aile olarak veya evden 19 Mayıs selamı gönderenler için.",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.65)",
  },

  general: {
    emoji: "🌍",
    label: "Genel",
    shortLabel: "Genel",
    description:
      "Diğer tüm genel destek, kutlama ve katılım mesajları için.",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.65)",
  },
} as const;

export type PinType = keyof typeof PIN_TYPES;

export const DEFAULT_PIN_TYPE: PinType = "greeting";

export const PIN_TYPE_OPTIONS = Object.entries(PIN_TYPES).map(([value, config]) => ({
  value: value as PinType,
  ...config,
}));
```

---

## 4. Pin Type Form UX

Kullanıcı pin eklerken pin türünü seçmeli.

Formda gösterilecek seçenekler:

```text
Pin türünü seç

🇹🇷 19 Mayıs Selamı
🎓 Öğrenci
📍 Etkinlik
🏠 Aileden Selam
🌍 Genel
```

Kurallar:

- Varsayılan seçili pin türü `greeting` olmalı.
- Kullanıcı isterse değiştirebilmeli.
- Pin type selector mobilde rahat tıklanabilir olmalı.
- Seçili kartta border, glow ve active state olmalı.
- Açıklama metinleri formu kalabalıklaştırmamalı.
- Gerekirse açıklama sadece hover veya küçük alt metin olarak gösterilmeli.

Önerilen UI davranışı:

```text
[🇹🇷 Selam] [🎓 Öğrenci] [📍 Etkinlik] [🏠 Aile] [🌍 Genel]
```

---

## 5. Globe Üzerinde Pin Görünümü

Globe yüzeyinde emoji gösterilmeyecek.

Globe’da gösterilecek şey:

- Küçük glowing point
- Pin type’a göre renk
- Hover durumunda biraz büyüme
- Selected durumunda daha belirgin glow
- Click ile premium detay popup/modal

Örnek kullanım:

```tsx
<Globe
  pointsData={visiblePins}
  pointLat={(pin) => pin.lat}
  pointLng={(pin) => pin.lng}
  pointColor={(pin) =>
    PIN_TYPES[pin.pin_type as PinType]?.color ?? PIN_TYPES.general.color
  }
  pointRadius={(pin) => selectedPin?.id === pin.id ? 0.42 : 0.28}
  pointAltitude={(pin) => selectedPin?.id === pin.id ? 0.035 : 0.015}
  onPointClick={(pin) => {
    setSelectedPin(pin as EventPin);
  }}
/>
```

Kurallar:

- `pointColor` mutlaka `pin_type` üzerinden belirlenmeli.
- Bilinmeyen pin type gelirse fallback `general` olmalı.
- Kullanıcı notu asla raw HTML olarak render edilmemeli.
- Popup dışında globe üzerinde büyük metin veya emoji gösterilmemeli.

---

## 6. Hover Tooltip

Hover sırasında küçük ama güzel bir tooltip gösterilebilir.

İçerik:

```text
🇹🇷 Umut Barış
Berlin, Germany
Berlin’den 19 Mayıs coşkusuyla selamlar!
```

Tooltip kuralları:

- Kısa olmalı.
- Sadece plain text render edilmeli.
- Not çok uzunsa kısaltılmalı.
- Mobilde hover olmadığı için tooltip zorunlu değil.
- Mobilde pin click doğrudan popup açmalı.

Örnek tooltip HTML mantığı:

```tsx
pointLabel={(pin) => {
  const type = PIN_TYPES[pin.pin_type as PinType] ?? PIN_TYPES.general;

  return `
    <div class="pin-tooltip">
      <div class="pin-tooltip-emoji">${type.emoji}</div>
      <strong>${escapeHtml(pin.display_name || "Katılımcı")}</strong>
      <span>${escapeHtml(pin.city)}, ${escapeHtml(pin.country)}</span>
      <p>${escapeHtml(truncate(pin.note, 90))}</p>
    </div>
  `;
}}
```

Not:

- `pointLabel` HTML string kabul ettiği için `escapeHtml` şarttır.
- Eğer mümkünse custom React tooltip tercih edilebilir.
- Kullanıcı datası hiçbir koşulda escape edilmeden HTML string içine koyulmamalıdır.

---

## 7. Pin Type Filter Chips

Globe altında veya sağ panelde filtreler olmalı.

Filtreler:

```text
Tümü
🇹🇷 Selam
🎓 Öğrenci
📍 Etkinlik
🏠 Aile
🌍 Genel
```

MVP’de frontend filtering yeterlidir.

```ts
const visiblePins =
  selectedPinType === "all"
    ? pins
    : pins.filter((pin) => pin.pin_type === selectedPinType);
```

Kurallar:

- Varsayılan filtre `all` olmalı.
- Filtreler mobilde yatay kaydırılabilir olabilir.
- Aktif filtre görsel olarak belirgin olmalı.
- Filtreler sadece approved public pinler üzerinde çalışmalı.

---

## 8. İstatistik Kartları

Globe UI üzerinde küçük premium istatistik kartları gösterilebilir.

Örnek:

```text
🌍 248 pin
🇹🇷 120 selam
🎓 42 öğrenci
📍 8 etkinlik
🏠 31 aile mesajı
```

Kurallar:

- Sadece `approved` pinler sayılmalı.
- `pending`, `rejected`, `hidden` pinler public istatistiklerde görünmemeli.
- Realtime şart değil.
- Sayılar sayfa refresh ile güncellense yeterli.
- İleri aşamada Supabase realtime eklenebilir.

Örnek hesaplama:

```ts
const stats = {
  total: pins.length,
  greeting: pins.filter((pin) => pin.pin_type === "greeting").length,
  student: pins.filter((pin) => pin.pin_type === "student").length,
  event: pins.filter((pin) => pin.pin_type === "event").length,
  family: pins.filter((pin) => pin.pin_type === "family").length,
  general: pins.filter((pin) => pin.pin_type === "general").length,
};
```

---

# 9. Premium Pin Click Popup / Modal

## 9.1 Amaç

Kullanıcı globe üzerindeki bir pine tıkladığında varsayılan, basit bir popup değil; güzel, modern, premium bir detay kartı açılmalı.

Bu kart kampanya ruhunu taşımalı.

Önerilen yaklaşım:

- Desktop: centered modal veya globe üzerinde floating glass card
- Mobile: bottom sheet style popup

---

## 9.2 Popup İçeriği

Pin’e tıklanınca gösterilecek bilgiler:

```text
🇹🇷

Umut Barış
Berlin, Germany

“Berlin’den 19 Mayıs coşkusuyla selamlar!”

19 Mayıs Selamı
19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı
```

Alanlar:

- Büyük emoji
- Kullanıcı display name
- Şehir
- Ülke
- Kullanıcı notu
- Pin type badge
- Etkinlik adı
- Oluşturulma tarihi, opsiyonel
- Share button, opsiyonel
- Report button, opsiyonel

Public popup içinde gösterilmeyecek bilgiler:

- Email
- User ID
- Exact address
- Phone number
- IP address
- Auth provider bilgisi

---

## 9.3 Popup Visual Style

Zorunlu görünüm:

- Glassmorphism background
- Dark navy transparent card
- Soft border
- Rounded corners
- Large emoji badge
- Elegant typography
- Pin type rengine göre subtle glow
- Close button
- Mobile-friendly bottom sheet

Örnek CSS:

```css
.pin-detail-modal {
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(22px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 28px;
  box-shadow: 0 30px 100px rgba(0, 0, 0, 0.55);
  color: white;
  max-width: 420px;
  width: calc(100% - 32px);
  padding: 24px;
}

.pin-detail-emoji {
  width: 72px;
  height: 72px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  background: rgba(255, 255, 255, 0.10);
  box-shadow: 0 0 40px var(--pin-glow);
}

.pin-detail-note {
  font-size: 18px;
  line-height: 1.55;
  font-weight: 500;
}

.pin-detail-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.10);
}

.pin-detail-location {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.pin-detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 0;
  background: rgba(255, 255, 255, 0.10);
  color: white;
  border-radius: 999px;
  width: 36px;
  height: 36px;
  cursor: pointer;
}
```

Mobile bottom sheet önerisi:

```css
@media (max-width: 768px) {
  .pin-detail-modal {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    width: auto;
    max-width: none;
    border-radius: 28px;
  }
}
```

---

## 9.4 Popup Interaction Rules

Davranış kuralları:

- Pin’e tıklayınca `selectedPin` set edilmeli.
- Modal açılmalı.
- ESC ile kapanmalı.
- Close button ile kapanmalı.
- Dışarı tıklama ile kapanmalı.
- Mobilde bottom-sheet gibi davranmalı.
- Mümkünse globe seçilen pine yumuşak focus yapmalı.
- Popup açıkken selected pin biraz daha büyük/parlak görünmeli.

Örnek state:

```ts
const [selectedPin, setSelectedPin] = useState<EventPin | null>(null);
```

Örnek click:

```ts
onPointClick={(pin) => {
  setSelectedPin(pin as EventPin);
}}
```

Örnek modal render:

```tsx
{selectedPin && (
  <PinDetailModal
    pin={selectedPin}
    onClose={() => setSelectedPin(null)}
  />
)}
```

---

## 9.5 Pin Detail Modal Component

Önerilen dosya:

```text
src/components/globe/PinDetailModal.tsx
```

Örnek component:

```tsx
import { PIN_TYPES, type PinType } from "@/config/pinTypes";

type EventPin = {
  id: string;
  display_name: string | null;
  city: string;
  country: string;
  note: string;
  pin_type: PinType;
  created_at?: string;
};

type PinDetailModalProps = {
  pin: EventPin;
  onClose: () => void;
};

export function PinDetailModal({ pin, onClose }: PinDetailModalProps) {
  const pinType = PIN_TYPES[pin.pin_type] ?? PIN_TYPES.general;

  return (
    <div className="pin-detail-overlay" onClick={onClose}>
      <article
        className="pin-detail-modal"
        style={{ "--pin-glow": pinType.glow } as React.CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="pin-detail-close"
          onClick={onClose}
          aria-label="Close pin detail"
        >
          ×
        </button>

        <div className="pin-detail-emoji">{pinType.emoji}</div>

        <div className="pin-detail-header">
          <h2>{pin.display_name || "Katılımcı"}</h2>
          <p className="pin-detail-location">
            {pin.city}, {pin.country}
          </p>
        </div>

        <p className="pin-detail-note">“{pin.note}”</p>

        <div className="pin-detail-badge">
          <span>{pinType.emoji}</span>
          <span>{pinType.label}</span>
        </div>

        <p className="pin-detail-event-name">
          19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı
        </p>
      </article>
    </div>
  );
}
```

Önemli güvenlik kuralı:

```text
React text interpolation güvenlidir.
dangerouslySetInnerHTML kullanılmayacak.
Kullanıcı notu HTML olarak render edilmeyecek.
```

---

# 10. Abuse Prevention & Data Security

## 10.1 Ana İlke

Bu proje public kampanya sayfasıdır.

Bu nedenle ilk çalışan sürümde bile kötüye kullanımı azaltan temel güvenlik önlemleri olmalıdır.

Hedef:

- Spam pin eklemeyi azaltmak
- Fake mass pinning’i zorlaştırmak
- Offensive notları public’e düşürmemek
- Kullanıcı verisini minimumda tutmak
- Public tarafta hassas veri göstermemek
- Admin moderasyonunu basit ama etkili yapmak

---

## 10.2 Login Required

Pin eklemek için login zorunlu olmalı.

Allowed auth:

```text
Supabase Google Login
```

Anonymous users can:

- View approved pins
- View statistics
- Click pins
- Read public popup content

Anonymous users cannot:

- Create pins
- Edit pins
- Delete pins
- Report pins repeatedly

---

## 10.3 One Pin Per User Per Event

Her kullanıcı her event için sadece 1 aktif pin oluşturabilmeli.

Event key:

```text
19-mayis-2026
```

Kural:

- Kullanıcı daha önce pin oluşturmadıysa yeni pin ekleyebilir.
- Kullanıcı daha önce pin oluşturduysa yeni pin açamaz.
- Bunun yerine “Pinini güncelle” akışı gösterilir.
- Pin güncellenirse tekrar `pending` durumuna döner.
- Böylece kullanıcı sürekli yeni pin spamleyemez.

Database unique index:

```sql
create unique index if not exists event_pins_one_pin_per_user_per_event
on public.event_pins (user_id, event_key);
```

Frontend mesajı:

```text
Bu etkinlik için zaten bir pin oluşturdun.
İstersen mevcut pinini güncelleyebilirsin.
```

---

## 10.4 Pending Approval by Default

Her yeni pin varsayılan olarak `pending` açılmalı.

```sql
status text not null default 'pending'
```

Allowed statuses:

```text
pending
approved
rejected
hidden
```

Public globe sadece bunu göstermeli:

```text
approved
```

Kural:

- Yeni pin public globe’da anında görünmemeli.
- Admin onayından sonra görünmeli.
- Kullanıcı pinini değiştirirse status tekrar `pending` olmalı.
- Admin isterse `rejected` veya `hidden` yapabilmeli.

---

## 10.5 Cooldown Between Updates

Kullanıcı pinini sürekli güncelleyerek spam yaratamamalı.

MVP kuralı:

```text
Aynı kullanıcı 5 dakika içinde tekrar pin submit/update yapamaz.
```

Bu kural server-side kontrol edilmeli.

Frontend-only cooldown yeterli değildir.

Suggested column:

```sql
alter table public.event_pins
add column if not exists last_submitted_at timestamptz default now();
```

Server-side logic:

```text
if now - last_submitted_at < 5 minutes:
  reject update
```

Kullanıcı mesajı:

```text
Pinini kısa süre önce güncelledin. Lütfen birkaç dakika sonra tekrar dene.
```

---

## 10.6 Note Length Limit

Kullanıcı notu kısa olmalı.

Önerilen limit:

```text
Minimum: 3 characters
Maximum: 180 characters
```

Kurallar:

- Boş not kabul edilmemeli.
- Çok uzun not kabul edilmemeli.
- HTML kabul edilmemeli.
- Script kabul edilmemeli.
- Link kabul edilmemeli.
- Aşırı tekrar eden karakterler engellenmeli.

Frontend constant:

```ts
const NOTE_MIN_LENGTH = 3;
const NOTE_MAX_LENGTH = 180;
```

---

## 10.7 Block Links in Notes

MVP’de notlarda link olmamalı.

Engellenecek örnekler:

```text
http://
https://
www.
t.me/
wa.me/
bit.ly
tinyurl
linktr.ee
```

Sebep:

- Spam riskini azaltır
- Scam riskini azaltır
- Moderasyon yükünü düşürür
- Public popup’ların temiz kalmasını sağlar

Server-side validation örneği:

```ts
const BLOCKED_LINK_PATTERNS = [
  "http://",
  "https://",
  "www.",
  "t.me/",
  "wa.me/",
  "bit.ly",
  "tinyurl",
  "linktr.ee",
];

function containsBlockedLink(value: string) {
  const normalized = value.toLowerCase();
  return BLOCKED_LINK_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}
```

---

## 10.8 Basic Bad Word / Abuse Filter

MVP’de basit bir server-side blocked words list kullanılabilir.

Kural:

- Ağır küfür, nefret söylemi, spam kelimeleri veya açıkça saldırgan içerikler otomatik `pending` bırakılabilir veya `rejected` yapılabilir.
- Blocked-word list public edilmemeli.
- Admin override yapabilmeli.
- AI moderation ilk sürüm için zorunlu değildir.

Önerilen davranış:

```text
Suspicious note:
- save as pending
- add moderation_note
- do not show publicly
```

---

## 10.9 Report Button

Approved pin detay popup’ında küçük bir “Report” butonu olabilir.

Report reasons:

```text
Spam
Offensive content
Wrong location
Personal data
Other
```

Önerilen tablo:

```sql
create table if not exists public.pin_reports (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.event_pins(id) on delete cascade,
  reporter_user_id uuid references auth.users(id),
  reason text not null,
  message text,
  created_at timestamptz not null default now()
);
```

Tekrarlı report engeli:

```sql
create unique index if not exists pin_reports_one_report_per_user_per_pin
on public.pin_reports (pin_id, reporter_user_id)
where reporter_user_id is not null;
```

Kural:

- Logged-in user aynı pini sadece bir kez report edebilir.
- Report sonrası kullanıcıya sade mesaj gösterilir.
- Report sayısı 3’e ulaşırsa pin otomatik `pending_review` gibi bir duruma alınabilir.
- MVP’de otomatik hiding şart değildir; admin panelde raporlar gösterilebilir.

Not:

Mevcut status listesine `pending_review` eklenmeyecekse 3 report sonrası `hidden` veya `pending` yapılabilir. MVP için en basit çözüm:

```text
3 report alan approved pin otomatik hidden yapılabilir.
Admin daha sonra inceler.
```

---

# 11. Data Security Rules

## 11.1 Store Minimum Personal Data

Sadece gerekli alanlar tutulmalı.

Allowed fields:

- `user_id`
- `display_name`
- `city`
- `country`
- `note`
- `lat`
- `lng`
- `pin_type`
- `status`
- `event_key`

Avoid:

- phone number
- full address
- exact street-level location
- birth date
- private email shown publicly
- IP address unless legally/operationally needed
- sensitive personal information

Public popup içinde email gösterilmeyecek.

---

## 11.2 Do Not Store Exact Home Location

Uygulama adres bazlı değil, şehir bazlı olmalı.

Kullanıcıdan açık adres istenmeyecek.

Form alanları:

```text
Country
City
Short note
Pin type
```

Eğer geocoding daha hassas koordinat döndürürse normalize edilecek.

Önerilen privacy rounding:

```ts
function roundCoordinate(value: number) {
  return Number(value.toFixed(2));
}
```

Alternatif:

```ts
function roundCoordinate(value: number) {
  return Number(value.toFixed(3));
}
```

Tercih:

```text
.toFixed(2) daha güvenli, yaklaşık şehir seviyesi verir.
.toFixed(3) daha doğru görünür ama biraz daha hassastır.
```

Bu proje için öneri:

```text
Default: toFixed(2)
```

Çünkü amaç kullanıcının tam yerini değil, şehir/küresel dağılımı göstermek.

---

## 11.3 Public Read Policy

Public users sadece approved pinleri okuyabilmeli.

Supabase RLS:

```sql
create policy "Public can read approved event pins"
on public.event_pins
for select
using (status = 'approved');
```

Bu policy sayesinde:

- Public globe pending pinleri göremez.
- Rejected pinler görünmez.
- Hidden pinler görünmez.
- Kullanıcıların moderasyon bekleyen içerikleri sızmaz.

---

## 11.4 User Insert Policy

Logged-in users sadece kendi user_id’leri ile insert yapabilmeli.

```sql
create policy "Users can insert own event pins"
on public.event_pins
for insert
with check (auth.uid() = user_id);
```

Ek kural:

- Insert sırasında status default `pending` olmalı.
- Kullanıcının `approved` status ile insert yapmasına izin verilmemeli.
- Bunun için API route veya DB trigger kullanılmalı.

---

## 11.5 User Update Policy

Kullanıcı sadece kendi pinini güncelleyebilmeli.

Ama kullanıcı kendi pinini approve edememeli.

Kural:

- Kullanıcı `city`, `country`, `note`, `pin_type`, `lat`, `lng` güncelleyebilir.
- Kullanıcı `status`, `moderated_by`, `moderated_at` değiştiremez.
- Kullanıcı pinini güncellediğinde status tekrar `pending` olmalı.
- Bu logic server-side yapılmalı.

Önerilen yaklaşım:

```text
Pin create/update işlemleri doğrudan client Supabase insert/update ile değil,
Next.js API route üzerinden yapılsın.
API route auth user kontrolünü ve validation’ı yapsın.
```

Bu clean-code açısından daha güvenlidir.

---

## 11.6 Admin Approval Only

Sadece admin kullanıcılar pin status değiştirebilmeli.

Admin table:

```sql
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);
```

Admin check function:

```sql
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;
```

Admin policy:

```sql
create policy "Admins can manage all event pins"
on public.event_pins
for all
using (public.is_admin())
with check (public.is_admin());
```

---

## 11.7 Never Expose API Secrets

Kurallar:

- Supabase anon key frontend’de kullanılabilir.
- Supabase service role key frontend’de asla kullanılmayacak.
- Google API key gerekiyorsa mümkünse server-side kullanılacak.
- Nominatim requestleri cache ve User-Agent kontrolü için server route üzerinden yapılmalı.
- `.env.local` GitHub’a commit edilmeyecek.
- Production secrets Vercel/Supabase dashboard üzerinden yönetilecek.

---

## 11.8 Server-Side Validation Required

Frontend validation yeterli değildir.

Pin create/update API route şunları kontrol etmeli:

- User logged in mi?
- User ID auth user ile eşleşiyor mu?
- User bu event için daha önce pin oluşturmuş mu?
- Pin type geçerli mi?
- Note uzunluğu geçerli mi?
- Note link içeriyor mu?
- Note HTML/script içeriyor mu?
- City boş mu?
- Country boş mu?
- Lat/lng number mı?
- Lat -90 ile 90 arasında mı?
- Lng -180 ile 180 arasında mı?
- Cooldown dolmuş mu?
- Kullanıcı status alanını manipüle etmeye çalışıyor mu?

---

## 11.9 XSS Protection

Kullanıcı verisi hiçbir yerde raw HTML olarak render edilmemeli.

Yasak:

```tsx
dangerouslySetInnerHTML
```

Kullanıcı kaynaklı alanlar:

- display_name
- note
- city
- country

Bu alanların hepsi plain text render edilmeli.

React interpolation tercih edilmeli:

```tsx
<p>{pin.note}</p>
```

HTML string gerekiyorsa sanitize/escape şarttır.

---

## 11.10 Optional CAPTCHA

İlk sürümde CAPTCHA zorunlu değil.

Çünkü:

- Google login var
- One pin per user per event var
- Pending approval var
- Note limit var
- Link block var

Spam yine de artarsa eklenebilir:

- Cloudflare Turnstile
- hCaptcha

Öneri:

```text
MVP’de CAPTCHA ekleme.
Abuse görülürse Turnstile ekle.
```

---

# 12. Recommended Database Changes

Aşağıdaki SQL, mevcut `event_pins` tablosuna pin type, moderation ve abuse prevention alanlarını eklemek için kullanılabilir.

## 12.1 Add Pin Type

```sql
alter table public.event_pins
add column if not exists pin_type text not null default 'greeting';
```

## 12.2 Add Status Constraint

```sql
alter table public.event_pins
drop constraint if exists event_pins_status_check;

alter table public.event_pins
add constraint event_pins_status_check
check (status in ('pending', 'approved', 'rejected', 'hidden'));
```

## 12.3 Add Pin Type Constraint

```sql
alter table public.event_pins
drop constraint if exists event_pins_pin_type_check;

alter table public.event_pins
add constraint event_pins_pin_type_check
check (pin_type in ('greeting', 'student', 'event', 'family', 'general'));
```

## 12.4 One Pin Per User Per Event

```sql
create unique index if not exists event_pins_one_pin_per_user_per_event
on public.event_pins (user_id, event_key);
```

## 12.5 Moderation Fields

```sql
alter table public.event_pins
add column if not exists moderated_at timestamptz,
add column if not exists moderated_by uuid references auth.users(id),
add column if not exists moderation_note text,
add column if not exists last_submitted_at timestamptz default now();
```

## 12.6 Reports Table

```sql
create table if not exists public.pin_reports (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.event_pins(id) on delete cascade,
  reporter_user_id uuid references auth.users(id),
  reason text not null,
  message text,
  created_at timestamptz not null default now()
);
```

## 12.7 Report Reason Constraint

```sql
alter table public.pin_reports
drop constraint if exists pin_reports_reason_check;

alter table public.pin_reports
add constraint pin_reports_reason_check
check (reason in ('spam', 'offensive', 'wrong_location', 'personal_data', 'other'));
```

## 12.8 One Report Per User Per Pin

```sql
create unique index if not exists pin_reports_one_report_per_user_per_pin
on public.pin_reports (pin_id, reporter_user_id)
where reporter_user_id is not null;
```

---

# 13. Recommended TypeScript Types

Önerilen dosya:

```text
src/types/eventPin.ts
```

İçerik:

```ts
import type { PinType } from "@/config/pinTypes";

export type EventPinStatus = "pending" | "approved" | "rejected" | "hidden";

export type EventPin = {
  id: string;
  user_id: string;
  display_name: string | null;
  city: string;
  country: string;
  note: string;
  lat: number;
  lng: number;
  pin_type: PinType;
  status: EventPinStatus;
  event_key: string;
  created_at: string;
  updated_at?: string | null;
  moderated_at?: string | null;
  moderated_by?: string | null;
  moderation_note?: string | null;
  last_submitted_at?: string | null;
};

export type PublicEventPin = Pick<
  EventPin,
  | "id"
  | "display_name"
  | "city"
  | "country"
  | "note"
  | "lat"
  | "lng"
  | "pin_type"
  | "event_key"
  | "created_at"
>;
```

---

# 14. API Route Validation Example

Önerilen dosya:

```text
src/lib/validation/pinValidation.ts
```

İçerik:

```ts
import { PIN_TYPES, type PinType } from "@/config/pinTypes";

const NOTE_MIN_LENGTH = 3;
const NOTE_MAX_LENGTH = 180;

const BLOCKED_LINK_PATTERNS = [
  "http://",
  "https://",
  "www.",
  "t.me/",
  "wa.me/",
  "bit.ly",
  "tinyurl",
  "linktr.ee",
];

export type PinPayload = {
  pin_type: string;
  city: string;
  country: string;
  note: string;
  lat: number;
  lng: number;
};

export function validatePinPayload(payload: PinPayload) {
  const errors: string[] = [];

  if (!(payload.pin_type in PIN_TYPES)) {
    errors.push("Invalid pin type.");
  }

  if (!payload.city || payload.city.trim().length < 2) {
    errors.push("City is required.");
  }

  if (!payload.country || payload.country.trim().length < 2) {
    errors.push("Country is required.");
  }

  const note = payload.note?.trim() ?? "";

  if (note.length < NOTE_MIN_LENGTH) {
    errors.push("Note is too short.");
  }

  if (note.length > NOTE_MAX_LENGTH) {
    errors.push("Note is too long.");
  }

  if (containsBlockedLink(note)) {
    errors.push("Links are not allowed in notes.");
  }

  if (containsHtmlLikeContent(note)) {
    errors.push("HTML is not allowed in notes.");
  }

  if (!Number.isFinite(payload.lat) || payload.lat < -90 || payload.lat > 90) {
    errors.push("Invalid latitude.");
  }

  if (!Number.isFinite(payload.lng) || payload.lng < -180 || payload.lng > 180) {
    errors.push("Invalid longitude.");
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      pin_type: payload.pin_type as PinType,
      city: payload.city.trim(),
      country: payload.country.trim(),
      note,
      lat: roundCoordinate(payload.lat),
      lng: roundCoordinate(payload.lng),
    },
  };
}

function containsBlockedLink(value: string) {
  const normalized = value.toLowerCase();
  return BLOCKED_LINK_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}

function containsHtmlLikeContent(value: string) {
  return /<[^>]*>/g.test(value);
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(2));
}
```

---

# 15. Agent Implementation Checklist

Agent bu bölümü uygularken aşağıdaki sırayı takip etmeli.

## Step 1 — Pin Types

- [ ] `src/config/pinTypes.ts` oluştur.
- [ ] 5 pin type ekle: `greeting`, `student`, `event`, `family`, `general`.
- [ ] Default pin type `greeting` olsun.
- [ ] TypeScript type export et.

## Step 2 — Database

- [ ] `event_pins.pin_type` alanını ekle.
- [ ] Pin type check constraint ekle.
- [ ] Status check constraint ekle.
- [ ] One pin per user per event unique index ekle.
- [ ] Moderation fields ekle.
- [ ] `pin_reports` tablosunu ekle.
- [ ] RLS policies’i kontrol et.

## Step 3 — Pin Form

- [ ] Formda pin type selector ekle.
- [ ] 5 seçenek emoji ile gösterilsin.
- [ ] Varsayılan seçim `greeting` olsun.
- [ ] Seçili kart görsel olarak belirgin olsun.
- [ ] Pin submit payload içine `pin_type` eklensin.

## Step 4 — Globe Visual

- [ ] Globe pin renkleri `pin_type` üzerinden belirlensin.
- [ ] Büyük emoji marker kullanılmasın.
- [ ] Hover/selected pin biraz büyüsün.
- [ ] Unknown pin type fallback `general` olsun.

## Step 5 — Filters & Stats

- [ ] Filter chips ekle.
- [ ] `Tümü`, `Selam`, `Öğrenci`, `Etkinlik`, `Aile`, `Genel` filtreleri olsun.
- [ ] Frontend filtering uygula.
- [ ] Stats cards ekle.
- [ ] Stats sadece approved pins üzerinden hesaplansın.

## Step 6 — Premium Popup

- [ ] `PinDetailModal.tsx` oluştur.
- [ ] Pin click ile `selectedPin` set edilsin.
- [ ] Modal açılıp kapanabilsin.
- [ ] Büyük emoji badge gösterilsin.
- [ ] Note güzel typography ile gösterilsin.
- [ ] Pin type badge gösterilsin.
- [ ] City/country gösterilsin.
- [ ] Email/user_id gösterilmesin.
- [ ] Mobile bottom sheet style ekle.

## Step 7 — Abuse Prevention

- [ ] Login olmadan pin submit engellensin.
- [ ] User başına event başına 1 pin kuralı uygulansın.
- [ ] Mevcut pin varsa update flow gösterilsin.
- [ ] Update sonrası status tekrar `pending` olsun.
- [ ] 5 dakika cooldown server-side uygulansın.
- [ ] Note max 180 karakter olsun.
- [ ] Linkler engellensin.
- [ ] HTML/script engellensin.
- [ ] Pending approval default olsun.

## Step 8 — Data Security

- [ ] Public sadece approved pinleri okuyabilsin.
- [ ] User sadece kendi pinini oluşturabilsin.
- [ ] User kendi pinini approve edemesin.
- [ ] Admin status değiştirebilsin.
- [ ] Email public UI’da görünmesin.
- [ ] Exact address istenmesin.
- [ ] Koordinatlar şehir seviyesine normalize edilsin.
- [ ] `dangerouslySetInnerHTML` kullanılmasın.

---

# 16. Final Agent Instruction

Aşağıdaki metin agent’a doğrudan verilebilir.

```text
Implement the pin type, emoji, premium popup, abuse prevention, and data security layer for the 19 Mayıs Premium Globe.

Use exactly 5 pin types:

1. greeting — 🇹🇷 19 Mayıs Selamı
2. student — 🎓 Öğrenci
3. event — 📍 Etkinlik
4. family — 🏠 Aileden Selam
5. general — 🌍 Genel

Do not render large permanent emojis on the globe surface.
The globe must show premium glowing points.
Emoji must be used in the form selector, filter chips, tooltip, popup, and stats only.

Add pin_type to event_pins.
Add database constraint for allowed pin types.
Add one pin per user per event rule.
Default pin type is greeting.
New and updated pins must become pending.
Public globe must show only approved pins.

Create a premium PinDetailModal.
When a pin is clicked, show a glassmorphism card with:
- large emoji
- display name
- city and country
- user note
- pin type badge
- event name

Do not show email, user_id, exact address, or private data publicly.

Add abuse prevention:
- login required for pin creation
- one pin per user per event
- 5 minute update cooldown
- note length 3-180 characters
- no links in notes
- no HTML/scripts
- server-side validation
- pending approval by default
- report button/table if time allows

Use clean-code structure:
- src/config/pinTypes.ts
- src/types/eventPin.ts
- src/components/globe/PinDetailModal.tsx
- src/lib/validation/pinValidation.ts

Keep the implementation low-code, stable, and easy to debug.
Do not overengineer.
Do not introduce unnecessary libraries.
Make the MVP work reliably first.
```

---

# 17. Final Design Decision

Bu proje için en doğru karar:

```text
Pin çeşitleri az ve kontrollü olacak.
Emoji kimlik verecek ama globe’u kirletmeyecek.
Globe premium glowing point yapısında kalacak.
Pin popup’ı kampanya kartı gibi güzel olacak.
Spam engeli için tek kullanıcı tek pin kuralı uygulanacak.
Public tarafta sadece approved ve güvenli veri görünecek.
```
