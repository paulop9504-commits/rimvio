-- Trade reservation cancel + seller double-booking guard metadata

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
    'expired',
    'cancelled'
  ));

alter table public.market_alignment_handshakes
  add column if not exists trade_cancel_reason text;

alter table public.market_alignment_handshakes
  add column if not exists trade_cancelled_at timestamptz;
