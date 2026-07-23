-- Session/device presence heartbeats (guest-first active counting).
-- No user_id required — device_id + session_id only.

create table if not exists public.analytics_presence (
  device_id text primary key,
  session_id text not null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  surface text,
  working boolean not null default false,
  path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_presence_last_seen_idx
  on public.analytics_presence (last_seen_at desc);

create index if not exists analytics_presence_session_idx
  on public.analytics_presence (session_id, last_seen_at desc);

create index if not exists analytics_presence_working_idx
  on public.analytics_presence (working, last_seen_at desc)
  where working = true;

alter table public.analytics_presence enable row level security;

-- Anonymous heartbeat upsert (guest-first).
drop policy if exists "Public upsert analytics presence" on public.analytics_presence;
create policy "Public upsert analytics presence"
  on public.analytics_presence for insert to anon, authenticated
  with check (true);

drop policy if exists "Public update analytics presence" on public.analytics_presence;
create policy "Public update analytics presence"
  on public.analytics_presence for update to anon, authenticated
  using (true)
  with check (true);

-- Aggregate counts only — clients should not list device rows in product UI.
drop policy if exists "Public read analytics presence" on public.analytics_presence;
create policy "Public read analytics presence"
  on public.analytics_presence for select to anon, authenticated
  using (true);
