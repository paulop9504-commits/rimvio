-- Reset scheduling rows that never started explicit 일정 맞추기.
-- Complements 060 (empty schedule_candidates); catches backfilled candidates without SLA.

update public.market_alignment_handshakes
set trade_status = 'chat'
where trade_status = 'scheduling'
  and scheduling_expires_at is null
  and meet_at is null;
