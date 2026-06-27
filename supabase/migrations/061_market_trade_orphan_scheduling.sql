-- Reset scheduling rows that never started explicit 일정 맞추기.
-- Complements 060 (empty schedule_candidates); catches backfilled candidates without SLA.

update public.market_alignment_handshakes
set trade_status = 'chat'
where trade_status = 'scheduling'
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
