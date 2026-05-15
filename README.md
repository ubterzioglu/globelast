# Corteqs Globe

Next.js App Router uygulamasi. Repo, Coolify uzerinden Dockerfile ile deploy edilecek sekilde hazirlandi.

## Local Development

```bash
npm install
npm run dev
```

Uygulama varsayilan olarak `http://localhost:3000` adresinde calisir.

## Environment Variables

Local gelistirme icin `.env.example` dosyasini referans alip `.env.local` olusturun.

Gerekli degiskenler:

```bash
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEOCODER_PROVIDER=nominatim
NOMINATIM_USER_AGENT=
GOOGLE_GEOCODING_API_KEY=
ENABLE_GOOGLE_GEOCODING=false
```

## Coolify Deployment

Bu repo Dockerfile tabanli Coolify deployment icin hazirdir.

### Coolify Ayarlari

- Build Pack: `Dockerfile`
- Dockerfile Location: `/Dockerfile`
- Port: `3000`
- Health Check Path: `/api/health`
- Branch: production'a deploy edecegin branch

### Coolify Environment Variables

Coolify tarafinda en az su degiskenleri tanimlayin:

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEOCODER_PROVIDER=nominatim
NOMINATIM_USER_AGENT=may19-globe/1.0 admin@example.com
GOOGLE_GEOCODING_API_KEY=
ENABLE_GOOGLE_GEOCODING=false
```

### Notlar

- Production build `next build --webpack` ile alinır.
- `next.config.ts` icinde `output: "standalone"` aktif, bu sayede runtime image daha kucuktur.
- Container `3000` portunu dinler.
- Health endpoint `GET /api/health` uzerindedir.
- Gercek secret degerlerini repoya commit etmeyin.

## Verification

```bash
npm run lint
npm run build
docker build -t corteqs-globe-4 .
```
