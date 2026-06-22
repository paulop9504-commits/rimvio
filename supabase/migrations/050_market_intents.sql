-- Market alignment intents — cross-user matching (v0)

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
