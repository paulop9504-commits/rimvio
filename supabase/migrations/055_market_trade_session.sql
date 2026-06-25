-- Market trade session fields — meet time/place as transaction SSOT (Pull UI experiment)

alter table public.market_alignment_handshakes
  add column if not exists trade_status text not null default 'scheduling'
    check (trade_status in ('scheduling', 'confirmed', 'meeting', 'completed')),
  add column if not exists meet_at timestamptz,
  add column if not exists meet_place_label text,
  add column if not exists meet_lat double precision,
  add column if not exists meet_lng double precision,
  add column if not exists schedule_candidates jsonb not null default '[]'::jsonb;

create index if not exists market_alignment_handshakes_trade_active_idx
  on public.market_alignment_handshakes (seeking_user_id, listing_user_id, trade_status, updated_at desc)
  where phase in ('pending_buyer_start', 'active') and trade_status <> 'completed';
