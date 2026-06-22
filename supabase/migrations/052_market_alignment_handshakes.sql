-- Market alignment handshakes — seller-first + buyer chat gate (v1.2)

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
