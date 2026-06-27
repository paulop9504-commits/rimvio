-- ============================================================
-- Market trade — post-bootstrap (run after 13–16 in sql-editor)
-- Idempotent: safe if 17–18 / 061 already partially applied
-- ============================================================

-- Cancel reservation columns
alter table public.market_alignment_handshakes
  add column if not exists trade_cancel_reason text;

alter table public.market_alignment_handshakes
  add column if not exists trade_cancelled_at timestamptz;

-- Heal orphan scheduling before tightening constraint
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
