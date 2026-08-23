-- PC Local Agent Phase B+C: capabilities, approval requests, install jobs

create table if not exists public.pc_local_agent_capabilities (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.pc_local_agent_devices (id) on delete cascade,
  capability_id text not null,
  version text not null default '1.0.0',
  status text not null default 'installed'
    check (status in ('installed', 'failed', 'revoked')),
  installed_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  unique (device_id, capability_id)
);

create index if not exists pc_local_agent_capabilities_device_idx
  on public.pc_local_agent_capabilities (device_id, capability_id);

create table if not exists public.pc_local_agent_capability_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid not null references public.pc_local_agent_devices (id) on delete cascade,
  task_id uuid not null references public.pc_local_agent_tasks (id) on delete cascade,
  required_capabilities text[] not null default '{}',
  reason text not null default 'capability_required',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'cancelled', 'completed')),
  created_at timestamptz not null default timezone('utc', now()),
  approved_at timestamptz,
  completed_at timestamptz
);

create index if not exists pc_local_agent_capability_requests_user_idx
  on public.pc_local_agent_capability_requests (user_id, status, created_at desc);

create index if not exists pc_local_agent_capability_requests_task_idx
  on public.pc_local_agent_capability_requests (task_id);

create table if not exists public.pc_local_agent_install_jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.pc_local_agent_capability_requests (id) on delete cascade,
  device_id uuid not null references public.pc_local_agent_devices (id) on delete cascade,
  capability_id text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists pc_local_agent_install_jobs_device_status_idx
  on public.pc_local_agent_install_jobs (device_id, status, created_at asc);

-- RLS
alter table public.pc_local_agent_capabilities enable row level security;
alter table public.pc_local_agent_capability_requests enable row level security;
alter table public.pc_local_agent_install_jobs enable row level security;

create policy "Users read own device capabilities"
  on public.pc_local_agent_capabilities for select
  using (
    exists (
      select 1 from public.pc_local_agent_devices d
      where d.id = device_id and d.user_id = auth.uid()
    )
  );

create policy "Users read own capability requests"
  on public.pc_local_agent_capability_requests for select
  using (auth.uid() = user_id);

create policy "Users update own capability requests"
  on public.pc_local_agent_capability_requests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read own install jobs"
  on public.pc_local_agent_install_jobs for select
  using (
    exists (
      select 1 from public.pc_local_agent_devices d
      where d.id = device_id and d.user_id = auth.uid()
    )
  );

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.pc_local_agent_capability_requests;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.pc_local_agent_install_jobs;
exception
  when duplicate_object then null;
end $$;
