-- Rimvio SQL Editor · Script 1/3
-- Experience Bridge — tables + RLS helpers (migrations 038 + 040)
-- Safe to re-run (idempotent). Run BEFORE 02-contributions, 03-storage.

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.experience_bridges (
  event_id text primary key,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  peer_thread_id text references public.peer_threads (id) on delete set null,
  title text not null,
  place_label text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  event_snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists experience_bridges_host_idx
  on public.experience_bridges (host_user_id, created_at desc);

create table if not exists public.experience_bridge_participants (
  bridge_event_id text not null references public.experience_bridges (event_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('host', 'member')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'left', 'removed')),
  invited_at timestamptz not null default timezone('utc', now()),
  joined_at timestamptz,
  left_at timestamptz,
  primary key (bridge_event_id, user_id)
);

create index if not exists experience_bridge_participants_user_status_idx
  on public.experience_bridge_participants (user_id, status, invited_at desc);

alter table public.experience_bridges enable row level security;
alter table public.experience_bridge_participants enable row level security;

-- ── RLS helper functions (avoid policy recursion) ─────────────────────────

create or replace function public.is_experience_bridge_member(
  p_bridge_event_id text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.experience_bridge_participants p
    where p.bridge_event_id = p_bridge_event_id
      and p.user_id = coalesce(p_user_id, auth.uid())
      and p.status in ('pending', 'accepted')
  );
$$;

create or replace function public.is_experience_bridge_host(
  p_bridge_event_id text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.experience_bridges b
    where b.event_id = p_bridge_event_id
      and b.host_user_id = coalesce(p_user_id, auth.uid())
  );
$$;

revoke all on function public.is_experience_bridge_member(text, uuid) from public;
grant execute on function public.is_experience_bridge_member(text, uuid) to authenticated;

revoke all on function public.is_experience_bridge_host(text, uuid) from public;
grant execute on function public.is_experience_bridge_host(text, uuid) to authenticated;

-- ── Policies: experience_bridges ──────────────────────────────────────────

drop policy if exists "Bridge participants read experience_bridges"
  on public.experience_bridges;
create policy "Bridge participants read experience_bridges"
  on public.experience_bridges for select to authenticated
  using (
    host_user_id = auth.uid()
    or public.is_experience_bridge_member(event_id, auth.uid())
  );

drop policy if exists "Host insert experience_bridges"
  on public.experience_bridges;
create policy "Host insert experience_bridges"
  on public.experience_bridges for insert to authenticated
  with check (host_user_id = auth.uid());

drop policy if exists "Host update experience_bridges"
  on public.experience_bridges;
create policy "Host update experience_bridges"
  on public.experience_bridges for update to authenticated
  using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

-- ── Policies: experience_bridge_participants ───────────────────────────────

drop policy if exists "Bridge members read experience_bridge_participants"
  on public.experience_bridge_participants;
create policy "Bridge members read experience_bridge_participants"
  on public.experience_bridge_participants for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_experience_bridge_host(bridge_event_id, auth.uid())
    or public.is_experience_bridge_member(bridge_event_id, auth.uid())
  );

drop policy if exists "Host insert bridge participants"
  on public.experience_bridge_participants;
create policy "Host insert bridge participants"
  on public.experience_bridge_participants for insert to authenticated
  with check (public.is_experience_bridge_host(bridge_event_id, auth.uid()));

drop policy if exists "Self or host update bridge participants"
  on public.experience_bridge_participants;
create policy "Self or host update bridge participants"
  on public.experience_bridge_participants for update to authenticated
  using (
    user_id = auth.uid()
    or public.is_experience_bridge_host(bridge_event_id, auth.uid())
  )
  with check (
    user_id = auth.uid()
    or public.is_experience_bridge_host(bridge_event_id, auth.uid())
  );
