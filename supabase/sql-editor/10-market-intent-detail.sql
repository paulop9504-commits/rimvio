-- Market intent detail slots — paste in Supabase SQL editor (mirrors 051)

alter table public.market_intents
  add column if not exists detail_json jsonb not null default '{}'::jsonb;
