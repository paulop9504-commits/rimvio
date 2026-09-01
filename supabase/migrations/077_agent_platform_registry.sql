-- Agent Platform — durable registry + goal state (serverless warm-store backup).
-- Runtime SSOT: lib/agent-platform/persistence/durable-store.ts

create table if not exists public.agent_platform_capabilities (
  capability_id text primary key,
  platform_id text not null,
  payload jsonb not null,
  published_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists agent_platform_capabilities_platform_idx
  on public.agent_platform_capabilities (platform_id, published_at desc);

create table if not exists public.agent_platform_goal_state (
  context_event_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_platform_sandbox_sessions (
  session_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.agent_platform_capabilities enable row level security;
alter table public.agent_platform_goal_state enable row level security;
alter table public.agent_platform_sandbox_sessions enable row level security;

create policy "Authenticated read agent platform capabilities"
  on public.agent_platform_capabilities for select to authenticated using (true);
create policy "Authenticated upsert agent platform capabilities"
  on public.agent_platform_capabilities for insert to authenticated with check (true);
create policy "Authenticated update agent platform capabilities"
  on public.agent_platform_capabilities for update to authenticated using (true);

create policy "Authenticated read agent platform goal state"
  on public.agent_platform_goal_state for select to authenticated using (true);
create policy "Authenticated upsert agent platform goal state"
  on public.agent_platform_goal_state for insert to authenticated with check (true);
create policy "Authenticated update agent platform goal state"
  on public.agent_platform_goal_state for update to authenticated using (true);

create policy "Authenticated read agent platform sandbox sessions"
  on public.agent_platform_sandbox_sessions for select to authenticated using (true);
create policy "Authenticated upsert agent platform sandbox sessions"
  on public.agent_platform_sandbox_sessions for insert to authenticated with check (true);
create policy "Authenticated update agent platform sandbox sessions"
  on public.agent_platform_sandbox_sessions for update to authenticated using (true);

grant select, insert, update on public.agent_platform_capabilities to authenticated;
grant select, insert, update on public.agent_platform_goal_state to authenticated;
grant select, insert, update on public.agent_platform_sandbox_sessions to authenticated;
