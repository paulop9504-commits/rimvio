-- Run in Supabase SQL editor if migration 060 not applied yet.
-- Chat-only match: trade_status = chat until buyer taps schedule (약속잡기)

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

update public.market_alignment_handshakes
set trade_status = 'chat'
where trade_status = 'scheduling'
  and coalesce(jsonb_array_length(schedule_candidates), 0) = 0
  and scheduling_expires_at is null
  and meet_at is null;
