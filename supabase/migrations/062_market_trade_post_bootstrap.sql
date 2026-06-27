-- Post-bootstrap heal + constraint (supersedes sql-editor/20-market-trade-post-bootstrap.sql)
-- Idempotent: safe if 061 already partially applied.

alter table public.market_alignment_handshakes
  add column if not exists trade_cancel_reason text;

alter table public.market_alignment_handshakes
  add column if not exists trade_cancelled_at timestamptz;

update public.market_alignment_handshakes
set trade_status = 'chat'
where trade_status = 'scheduling'
  and scheduling_expires_at is null
  and meet_at is null;

update public.market_alignment_handshakes
set trade_status = 'chat'
where trade_status = 'scheduling'
  and coalesce(jsonb_array_length(schedule_candidates), 0) = 0
  and scheduling_expires_at is null
  and meet_at is null;

alter table public.market_alignment_handshakes
  drop constraint if exists market_alignment_handshakes_trade_status_check;

alter table public.market_alignment_handshakes
  add constraint market_alignment_handshakes_trade_status_check
  check (trade_status in (
    'chat',
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
  alter column trade_status set default 'chat';
