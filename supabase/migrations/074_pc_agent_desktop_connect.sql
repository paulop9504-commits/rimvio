-- PC connect: permissions on device + browser session pairing (no API key copy).

alter table public.pc_local_agent_devices
  add column if not exists permissions jsonb not null default '{
    "browser": true,
    "webWork": true,
    "allowedApps": true,
    "taskStatus": true,
    "screen": true
  }'::jsonb;

create table if not exists public.pc_local_agent_desktop_sessions (
  id uuid primary key default gen_random_uuid(),
  nonce text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'exchanged', 'expired')),
  user_id uuid references auth.users (id) on delete cascade,
  device_id uuid references public.pc_local_agent_devices (id) on delete set null,
  device_name text not null default 'My PC',
  callback_port integer not null default 38472,
  exchange_hash text,
  pending_token text,
  permissions jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pc_local_agent_desktop_sessions_status_idx
  on public.pc_local_agent_desktop_sessions (status, expires_at);

alter table public.pc_local_agent_desktop_sessions enable row level security;

create policy "Deny client desktop sessions"
  on public.pc_local_agent_desktop_sessions for select
  using (false);
