-- Pull scheduling v2 — run after 15-market-trade-schedule-v1.sql

alter table public.market_alignment_handshakes
  drop constraint if exists market_alignment_handshakes_trade_status_check;

alter table public.market_alignment_handshakes
  add constraint market_alignment_handshakes_trade_status_check
  check (trade_status in (
    'scheduling',
    'buyer_picked_day',
    'seller_proposed',
    'confirmed',
    'en_route',
    'meeting',
    'completed',
    'expired'
  ));

alter table public.market_alignment_handshakes
  add column if not exists preferred_meet_date text;
