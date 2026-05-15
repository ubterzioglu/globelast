create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

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

alter table public.event_pins enable row level security;
alter table public.geocode_cache enable row level security;

create policy "Public can read approved event pins"
on public.event_pins
for select
to anon, authenticated
using (status = 'approved');

create policy "Users can read own event pins"
on public.event_pins
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own pending event pins"
on public.event_pins
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
);

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

create policy "Admins can read all event pins"
on public.event_pins
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "Admins can update all event pins"
on public.event_pins
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Admins can read geocode cache"
on public.geocode_cache
for select
to authenticated
using (public.is_admin(auth.uid()));
