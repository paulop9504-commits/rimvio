-- Market handshake completion — paste after RUN-MARKET-ALL (mirrors 053)

alter table public.market_alignment_handshakes
  drop constraint if exists market_alignment_handshakes_phase_check;

alter table public.market_alignment_handshakes
  add constraint market_alignment_handshakes_phase_check
  check (phase in (
    'pending_listing',
    'pending_buyer_start',
    'active',
    'declined',
    'completed'
  ));

alter table public.market_alignment_handshakes
  add column if not exists seeking_confirmed_at timestamptz,
  add column if not exists listing_confirmed_at timestamptz,
  add column if not exists realized_price_krw bigint,
  add column if not exists completed_at timestamptz;
