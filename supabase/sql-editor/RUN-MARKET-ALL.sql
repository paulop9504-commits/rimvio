-- ============================================================
-- Market alignment — Supabase SQL Editor에 이 파일 전체 복사 후 Run
-- Cursor에서 열기: Ctrl+P → RUN-MARKET-ALL
-- ============================================================

-- 1/3 market_intents (050)
create table if not exists public.market_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_event_id text not null,
  role text not null check (role in ('listing', 'seeking')),
  category_id text not null,
  title text not null,
  price_min_krw bigint,
  price_max_krw bigint,
  radius_km numeric not null default 5 check (radius_km > 0 and radius_km <= 50),
  anchor_lat double precision not null,
  anchor_lng double precision not null,
  place_label text not null default '',
  peak_hour text,
  active boolean not null default true,
  confirmed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, client_event_id)
);

create index if not exists market_intents_active_category_idx
  on public.market_intents (active, category_id, confirmed_at desc)
  where active = true;

create index if not exists market_intents_user_active_idx
  on public.market_intents (user_id, active, updated_at desc);

alter table public.market_intents enable row level security;

create policy "Read active market intents"
  on public.market_intents
  for select
  to authenticated
  using (active = true);

create policy "Users insert own market intents"
  on public.market_intents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own market intents"
  on public.market_intents
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own market intents"
  on public.market_intents
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.market_intents to authenticated;

-- 2/3 detail_json (051)
alter table public.market_intents
  add column if not exists detail_json jsonb not null default '{}'::jsonb;

-- 3/3 handshakes (052)
create table if not exists public.market_alignment_handshakes (
  id uuid primary key default gen_random_uuid(),
  seeking_intent_id uuid not null references public.market_intents (id) on delete cascade,
  listing_intent_id uuid not null references public.market_intents (id) on delete cascade,
  seeking_user_id uuid not null references auth.users (id) on delete cascade,
  listing_user_id uuid not null references auth.users (id) on delete cascade,
  thread_id text references public.peer_threads (id) on delete set null,
  phase text not null default 'pending_listing'
    check (phase in ('pending_listing', 'pending_buyer_start', 'active', 'declined')),
  alignment_score double precision,
  priority_hint text not null default '',
  listing_accepted_at timestamptz,
  buyer_started_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (seeking_intent_id, listing_intent_id)
);

create index if not exists market_alignment_handshakes_listing_pending_idx
  on public.market_alignment_handshakes (listing_user_id, phase, updated_at desc)
  where phase = 'pending_listing';

create index if not exists market_alignment_handshakes_seeking_pending_idx
  on public.market_alignment_handshakes (seeking_user_id, phase, updated_at desc)
  where phase = 'pending_buyer_start';

alter table public.market_alignment_handshakes enable row level security;

create policy "Participants read market handshakes"
  on public.market_alignment_handshakes
  for select
  to authenticated
  using (auth.uid() = seeking_user_id or auth.uid() = listing_user_id);

create policy "Participants insert market handshakes"
  on public.market_alignment_handshakes
  for insert
  to authenticated
  with check (auth.uid() = seeking_user_id or auth.uid() = listing_user_id);

create policy "Participants update market handshakes"
  on public.market_alignment_handshakes
  for update
  to authenticated
  using (auth.uid() = seeking_user_id or auth.uid() = listing_user_id)
  with check (auth.uid() = seeking_user_id or auth.uid() = listing_user_id);

grant select, insert, update on public.market_alignment_handshakes to authenticated;

-- 4/4 handshake completion (053) — run after table exists
alter table public.market_alignment_handshakes
  drop constraint if exists market_alignment_handshakes_phase_check;

alter table public.market_alignment_handshakes
  add constraint market_alignment_handshakes_phase_check
  check (phase in (
    'pending_listing',
    'pending_buyer_start',
    'active',
    'declined',
    'completed'
  ));

alter table public.market_alignment_handshakes
  add column if not exists seeking_confirmed_at timestamptz,
  add column if not exists listing_confirmed_at timestamptz,
  add column if not exists realized_price_krw bigint,
  add column if not exists completed_at timestamptz;
