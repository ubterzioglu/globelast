DELETE FROM public.event_pins a
USING public.event_pins b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.event_key = b.event_key;

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
  contact_email text not null default '',
  contact_phone text,

  lat double precision not null,
  lng double precision not null,

  pin_type text not null default 'greeting'
    check (pin_type in ('greeting', 'student', 'event', 'family', 'general')),

  geocode_provider text not null default 'nominatim',
  geocode_display_name text,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'hidden')),

  rejection_reason text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,

  moderated_at timestamptz,
  moderated_by uuid references auth.users(id),
  moderation_note text,
  last_submitted_at timestamptz default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_pins_display_name_length check (char_length(display_name) between 2 and 80),
  constraint event_pins_city_length check (char_length(city) between 2 and 120),
  constraint event_pins_country_length check (char_length(country) between 2 and 120),
  constraint event_pins_note_length check (char_length(note) between 2 and 180),
  constraint event_pins_contact_email_length check (char_length(contact_email) between 5 and 255),
  constraint event_pins_contact_phone_length check (contact_phone is null or char_length(contact_phone) between 7 and 30),
  constraint event_pins_lat_range check (lat between -90 and 90),
  constraint event_pins_lng_range check (lng between -180 and 180)
);

-- Backfill/migration block for existing installations where event_pins
-- was created by an older schema version.
alter table public.event_pins
  add column if not exists pin_type text not null default 'greeting';

alter table public.event_pins
  add column if not exists moderated_at timestamptz;

alter table public.event_pins
  add column if not exists moderated_by uuid references auth.users(id);

alter table public.event_pins
  add column if not exists moderation_note text;

alter table public.event_pins
  add column if not exists last_submitted_at timestamptz default now();

alter table public.event_pins
  add column if not exists contact_email text;

alter table public.event_pins
  add column if not exists contact_phone text;

update public.event_pins
set contact_email = coalesce(
  nullif(contact_email, ''),
  'unknown@example.com'
)
where contact_email is null or contact_email = '';

alter table public.event_pins
  alter column contact_email set not null;

alter table public.event_pins
  alter column contact_email set default '';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.event_pins'::regclass
      and conname = 'event_pins_contact_email_length'
  ) then
    alter table public.event_pins
      drop constraint event_pins_contact_email_length;
  end if;

  alter table public.event_pins
    add constraint event_pins_contact_email_length
    check (char_length(contact_email) between 5 and 255);
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.event_pins'::regclass
      and conname = 'event_pins_contact_phone_length'
  ) then
    alter table public.event_pins
      drop constraint event_pins_contact_phone_length;
  end if;

  alter table public.event_pins
    add constraint event_pins_contact_phone_length
    check (contact_phone is null or char_length(contact_phone) between 7 and 30);
exception
  when duplicate_object then
    null;
end $$;

-- Ensure the newer status enum/check is present on older databases.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.event_pins'::regclass
      and conname = 'event_pins_status_check'
  ) then
    alter table public.event_pins
      drop constraint event_pins_status_check;
  end if;

  alter table public.event_pins
    add constraint event_pins_status_check
    check (status in ('pending', 'approved', 'rejected', 'hidden'));
exception
  when duplicate_object then
    null;
end $$;

-- Ensure pin_type check exists for older databases.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.event_pins'::regclass
      and conname = 'event_pins_pin_type_check'
  ) then
    alter table public.event_pins
      drop constraint event_pins_pin_type_check;
  end if;

  alter table public.event_pins
    add constraint event_pins_pin_type_check
    check (pin_type in ('greeting', 'student', 'event', 'family', 'general'));
exception
  when duplicate_object then
    null;
end $$;

delete from public.event_pins
where id in (
  select a.id
  from public.event_pins a
  join public.event_pins b
    on a.user_id = b.user_id
   and a.event_key = b.event_key
   and a.id < b.id
);

create index if not exists event_pins_public_idx
on public.event_pins (event_key, status, created_at desc);

create index if not exists event_pins_user_idx
on public.event_pins (user_id, event_key, created_at desc);

create unique index if not exists event_pins_one_pin_per_user_per_event
on public.event_pins (user_id, event_key);

create table if not exists public.pin_reports (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.event_pins(id) on delete cascade,
  reporter_user_id uuid references auth.users(id),
  reason text not null,
  message text,
  created_at timestamptz not null default now(),

  constraint pin_reports_reason_check
    check (reason in ('spam', 'offensive', 'wrong_location', 'personal_data', 'other'))
);

create table if not exists public.pin_submission_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_key text not null,
  device_fingerprint_hash text not null,
  ip_hash text not null,
  action text not null check (action in ('create', 'update')),
  created_at timestamptz not null default now()
);

create index if not exists pin_submission_logs_device_idx
on public.pin_submission_logs (device_fingerprint_hash, created_at desc);

create index if not exists pin_submission_logs_ip_idx
on public.pin_submission_logs (ip_hash, created_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  source text not null,
  path text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_idx
on public.analytics_events (event_name, created_at desc);

create unique index if not exists pin_reports_one_report_per_user_per_pin
on public.pin_reports (pin_id, reporter_user_id)
where reporter_user_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_pins_set_updated_at on public.event_pins;

create trigger event_pins_set_updated_at
before update on public.event_pins
for each row
execute function public.set_updated_at();

alter table public.event_pins enable row level security;
alter table public.geocode_cache enable row level security;
alter table public.pin_reports enable row level security;
alter table public.pin_submission_logs enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "Public can read approved event pins" on public.event_pins;
create policy "Public can read approved event pins"
on public.event_pins
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "Users can read own event pins" on public.event_pins;
create policy "Users can read own event pins"
on public.event_pins
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own pending event pins" on public.event_pins;
create policy "Users can insert own pending event pins"
on public.event_pins
for insert
to authenticated
with check (
  auth.uid() = user_id
  and status = 'pending'
);

drop policy if exists "Users can update own pending event pins" on public.event_pins;
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

drop policy if exists "Admins can read all event pins" on public.event_pins;
create policy "Admins can read all event pins"
on public.event_pins
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update all event pins" on public.event_pins;
create policy "Admins can update all event pins"
on public.event_pins
for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can read geocode cache" on public.geocode_cache;
create policy "Admins can read geocode cache"
on public.geocode_cache
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Authenticated users can report pins" on public.pin_reports;
create policy "Authenticated users can report pins"
on public.pin_reports
for insert
to authenticated
with check (
  auth.uid() = reporter_user_id
);

drop policy if exists "Admins can read pin reports" on public.pin_reports;
create policy "Admins can read pin reports"
on public.pin_reports
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can read pin submission logs" on public.pin_submission_logs;
create policy "Admins can read pin submission logs"
on public.pin_submission_logs
for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can read analytics events" on public.analytics_events;
create policy "Admins can read analytics events"
on public.analytics_events
for select
to authenticated
using (public.is_admin(auth.uid()));
