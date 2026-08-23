-- PC Local Agent MVP: devices, pairing, tasks

create table if not exists public.pc_local_agent_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'My PC',
  type text not null default 'PC' check (type in ('PC')),
  status text not null default 'OFFLINE' check (status in ('ONLINE', 'OFFLINE')),
  last_seen_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pc_local_agent_devices_user_idx
  on public.pc_local_agent_devices (user_id, updated_at desc);

create table if not exists public.pc_local_agent_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  device_id uuid references public.pc_local_agent_devices (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists pc_local_agent_pairing_codes_code_uidx
  on public.pc_local_agent_pairing_codes (code)
  where consumed_at is null;

create index if not exists pc_local_agent_pairing_codes_user_idx
  on public.pc_local_agent_pairing_codes (user_id, created_at desc);

create table if not exists public.pc_local_agent_device_tokens (
  device_id uuid primary key references public.pc_local_agent_devices (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create table if not exists public.pc_local_agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id uuid not null references public.pc_local_agent_devices (id) on delete cascade,
  type text not null check (type in ('OPEN_URL')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'CREATED'
    check (status in ('CREATED', 'QUEUED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  result jsonb,
  error text,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  claimed_by_agent_at timestamptz
);

create index if not exists pc_local_agent_tasks_user_idx
  on public.pc_local_agent_tasks (user_id, created_at desc);

create index if not exists pc_local_agent_tasks_device_status_idx
  on public.pc_local_agent_tasks (device_id, status, created_at asc);

-- RLS
alter table public.pc_local_agent_devices enable row level security;
alter table public.pc_local_agent_pairing_codes enable row level security;
alter table public.pc_local_agent_device_tokens enable row level security;
alter table public.pc_local_agent_tasks enable row level security;

create policy "Users read own pc agent devices"
  on public.pc_local_agent_devices for select
  using (auth.uid() = user_id);

create policy "Users insert own pc agent devices"
  on public.pc_local_agent_devices for insert
  with check (auth.uid() = user_id);

create policy "Users update own pc agent devices"
  on public.pc_local_agent_devices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read own pc agent pairing codes"
  on public.pc_local_agent_pairing_codes for select
  using (auth.uid() = user_id);

create policy "Users insert own pc agent pairing codes"
  on public.pc_local_agent_pairing_codes for insert
  with check (auth.uid() = user_id);

create policy "Users update own pc agent pairing codes"
  on public.pc_local_agent_pairing_codes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Device tokens: no direct client access (API routes use service role)
create policy "Deny client read device tokens"
  on public.pc_local_agent_device_tokens for select
  using (false);

create policy "Users read own pc agent tasks"
  on public.pc_local_agent_tasks for select
  using (auth.uid() = user_id);

create policy "Users insert own pc agent tasks"
  on public.pc_local_agent_tasks for insert
  with check (auth.uid() = user_id);

create policy "Users update own pc agent tasks"
  on public.pc_local_agent_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.pc_local_agent_devices;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.pc_local_agent_tasks;
exception
  when duplicate_object then null;
end $$;
