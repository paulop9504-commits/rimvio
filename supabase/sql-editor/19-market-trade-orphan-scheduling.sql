-- Reset legacy scheduling rows that never started 일정 맞추기.
-- Run if 진행 중 tab shows trades before buyer tapped schedule.

update public.market_alignment_handshakes
set trade_status = 'chat'
where trade_status = 'scheduling'
  and scheduling_expires_at is null
  and meet_at is null;
