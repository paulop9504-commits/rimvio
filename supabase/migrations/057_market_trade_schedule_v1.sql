-- Schedule preference + 24h SLA (Pull scheduling v1)

alter table public.market_alignment_handshakes
  drop constraint if exists market_alignment_handshakes_trade_status_check;

alter table public.market_alignment_handshakes
  add constraint market_alignment_handshakes_trade_status_check
  check (trade_status in (
    'scheduling',
    'confirmed',
    'en_route',
    'meeting',
    'completed',
    'expired'
  ));

alter table public.market_alignment_handshakes
  add column if not exists preferred_meet_at timestamptz,
  add column if not exists scheduling_expires_at timestamptz;
