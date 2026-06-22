-- Market intent detail slots (wizard v1)

alter table public.market_intents
  add column if not exists detail_json jsonb not null default '{}'::jsonb;
