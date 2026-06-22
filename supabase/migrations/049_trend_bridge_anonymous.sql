-- Anonymous trend bridge — EXIF capture contributions + k-anonymity rollups

create table if not exists public.trend_bridge_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_hash text not null,
  bridge_id text not null,
  location_dong text not null,
  category_label text not null,
  capture_at timestamptz not null,
  day_segment text not null check (day_segment in ('weekday', 'weekend')),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  hour_bucket smallint not null check (hour_bucket between 0 and 23),
  lat double precision,
  lng double precision,
  sentiment text,
  source_capture_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, bridge_id, source_capture_id)
);

create index if not exists trend_bridge_contributions_rollup_idx
  on public.trend_bridge_contributions (bridge_id, location_dong, day_segment, capture_at desc);

create index if not exists trend_bridge_contributions_geo_idx
  on public.trend_bridge_contributions (bridge_id, lat, lng)
  where lat is not null and lng is not null;

alter table public.trend_bridge_contributions enable row level security;

create policy "Users insert own trend bridge contributions"
  on public.trend_bridge_contributions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own trend bridge contributions"
  on public.trend_bridge_contributions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own trend bridge contributions"
  on public.trend_bridge_contributions for delete to authenticated
  using (auth.uid() = user_id);

-- Aggregated rollups only — no raw user linkage exposed to clients
create table if not exists public.trend_bridge_rollups (
  id uuid primary key default gen_random_uuid(),
  bridge_id text not null,
  location_dong text not null,
  category_label text not null,
  day_segment text not null check (day_segment in ('weekday', 'weekend')),
  peak_hour_label text not null,
  peak_bucket_start smallint not null check (peak_bucket_start between 0 and 23),
  trend_velocity text not null check (trend_velocity in ('low', 'medium', 'high')),
  context_summary text not null,
  hotspot_lat double precision not null,
  hotspot_lng double precision not null,
  contributor_count integer not null check (contributor_count >= 5),
  record_count integer not null default 0,
  computed_at timestamptz not null default timezone('utc', now()),
  unique (bridge_id, location_dong, day_segment)
);

create index if not exists trend_bridge_rollups_bridge_geo_idx
  on public.trend_bridge_rollups (bridge_id, hotspot_lat, hotspot_lng);

create index if not exists trend_bridge_rollups_bridge_day_idx
  on public.trend_bridge_rollups (bridge_id, day_segment, computed_at desc);

alter table public.trend_bridge_rollups enable row level security;

create policy "Authenticated read trend bridge rollups"
  on public.trend_bridge_rollups for select to authenticated
  using (true);

grant select on public.trend_bridge_rollups to authenticated;
grant insert, delete on public.trend_bridge_contributions to authenticated;
