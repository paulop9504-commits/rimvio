-- Capability Execution Ledger — durable append-only provenance (P3).
-- SSOT at runtime remains lib/capability-ledger/execution-store; this table is durable audit.

create table if not exists public.capability_executions (
  execution_id text primary key,
  user_request_id text not null,
  context_event_id text,
  parent_execution_id text references public.capability_executions (execution_id) on delete set null,
  agent_id text,
  capability_id text not null,
  tool_id text,
  developer_id text not null,
  publisher_id text,
  provider_id text,
  input_class text not null,
  pricing_tier text not null,
  execution_status text not null,
  output_quality numeric(4, 2) not null default 0,
  usage_weight numeric(6, 2) not null default 0,
  unit_price_krw integer not null default 0,
  payout_krw integer not null default 0,
  manifest_version text,
  finalized boolean not null default false,
  executed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists capability_executions_developer_idx
  on public.capability_executions (developer_id, executed_at desc);

create index if not exists capability_executions_request_idx
  on public.capability_executions (user_request_id, executed_at desc);

create index if not exists capability_executions_parent_idx
  on public.capability_executions (parent_execution_id)
  where parent_execution_id is not null;

alter table public.capability_executions enable row level security;

create policy "Authenticated read capability executions"
  on public.capability_executions
  for select
  to authenticated
  using (true);

create policy "Service insert capability executions"
  on public.capability_executions
  for insert
  to authenticated
  with check (true);

grant select, insert on public.capability_executions to authenticated;
