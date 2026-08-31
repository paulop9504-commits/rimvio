-- Reality Data Network — task pool + verifier responses (R2).
-- @see docs/adr/065-reality-data-network-contributor-economy.md

create table if not exists public.reality_tasks (
  task_id text primary key,
  task_type text not null,
  title_ko text not null,
  target_label_ko text not null,
  domain text not null,
  status text not null,
  supplier_id text not null,
  base_reward_krw integer not null default 0,
  consensus_confidence numeric(4, 2),
  consensus_verdict text,
  target_ref text,
  context_event_id text,
  spawn_reason text,
  ai_pre_label jsonb,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.verifier_responses (
  response_id text primary key,
  task_id text not null references public.reality_tasks (task_id) on delete cascade,
  verifier_id text not null,
  answer_id text not null,
  answer_label_ko text not null,
  responded_at timestamptz not null default timezone('utc', now()),
  latency_ms integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reality_tasks_status_idx
  on public.reality_tasks (status, submitted_at desc);

create index if not exists reality_tasks_target_ref_idx
  on public.reality_tasks (target_ref)
  where target_ref is not null;

create index if not exists verifier_responses_task_idx
  on public.verifier_responses (task_id, responded_at desc);

alter table public.reality_tasks enable row level security;
alter table public.verifier_responses enable row level security;

create policy "Authenticated read reality tasks"
  on public.reality_tasks for select to authenticated using (true);

create policy "Authenticated insert reality tasks"
  on public.reality_tasks for insert to authenticated with check (true);

create policy "Authenticated read verifier responses"
  on public.verifier_responses for select to authenticated using (true);

create policy "Authenticated insert verifier responses"
  on public.verifier_responses for insert to authenticated with check (true);

grant select, insert on public.reality_tasks to authenticated;
grant select, insert on public.verifier_responses to authenticated;
