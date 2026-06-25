-- HOST mode — guest location share + en_route (experiment v2)

alter table public.market_alignment_handshakes
  drop constraint if exists market_alignment_handshakes_trade_status_check;

alter table public.market_alignment_handshakes
  add constraint market_alignment_handshakes_trade_status_check
  check (trade_status in (
    'scheduling',
    'confirmed',
    'en_route',
    'meeting',
    'completed'
  ));

alter table public.market_alignment_handshakes
  add column if not exists meet_mode text not null default 'host'
    check (meet_mode in ('host', 'convergence')),
  add column if not exists guest_share_location boolean not null default false,
  add column if not exists guest_lat double precision,
  add column if not exists guest_lng double precision,
  add column if not exists guest_location_at timestamptz;
