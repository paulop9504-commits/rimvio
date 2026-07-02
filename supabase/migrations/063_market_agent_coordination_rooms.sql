-- AI agent coordination rooms — handshake-scoped negotiation SSOT (v1)

create table if not exists public.market_agent_coordination_rooms (
  handshake_id uuid primary key
    references public.market_alignment_handshakes (id) on delete cascade,
  state text not null default 'NEGOTIATING'
    check (
      state in (
        'NEGOTIATING',
        'WAITING_USER_INPUT',
        'AGREED',
        'STUCK',
        'PAUSED',
        'APPROVED'
      )
    ),
  log_json jsonb not null default '[]'::jsonb,
  filled_slots jsonb not null default '{}'::jsonb,
  pending_question jsonb,
  proposal jsonb,
  turn_count integer not null default 0 check (turn_count >= 0),
  waiting_since timestamptz,
  product_title text not null default '',
  price_line text not null default '',
  thread_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists market_agent_coordination_rooms_updated_idx
  on public.market_agent_coordination_rooms (updated_at desc);

alter table public.market_agent_coordination_rooms enable row level security;

create policy "Handshake participants read coordination rooms"
  on public.market_agent_coordination_rooms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.market_alignment_handshakes h
      where h.id = handshake_id
        and (h.seeking_user_id = auth.uid() or h.listing_user_id = auth.uid())
    )
  );

create policy "Handshake participants insert coordination rooms"
  on public.market_agent_coordination_rooms
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.market_alignment_handshakes h
      where h.id = handshake_id
        and (h.seeking_user_id = auth.uid() or h.listing_user_id = auth.uid())
    )
  );

create policy "Handshake participants update coordination rooms"
  on public.market_agent_coordination_rooms
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.market_alignment_handshakes h
      where h.id = handshake_id
        and (h.seeking_user_id = auth.uid() or h.listing_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.market_alignment_handshakes h
      where h.id = handshake_id
        and (h.seeking_user_id = auth.uid() or h.listing_user_id = auth.uid())
    )
  );

grant select, insert, update on public.market_agent_coordination_rooms to authenticated;
