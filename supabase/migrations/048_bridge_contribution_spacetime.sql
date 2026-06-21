-- Bridge contribution spacetime columns + per-member sync cursors (migration 048)

alter table public.experience_bridge_contributions
  add column if not exists file_hash text,
  add column if not exists taken_at_iso timestamptz,
  add column if not exists geohash text,
  add column if not exists storage_path text;

create index if not exists experience_bridge_contributions_bridge_hash_idx
  on public.experience_bridge_contributions (bridge_event_id, file_hash)
  where file_hash is not null;

create index if not exists experience_bridge_contributions_bridge_taken_idx
  on public.experience_bridge_contributions (bridge_event_id, taken_at_iso desc);

create table if not exists public.experience_bridge_sync_cursors (
  bridge_event_id text not null references public.experience_bridges (event_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_pulled_at timestamptz not null default timezone('utc', now()),
  last_contribution_created_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (bridge_event_id, user_id)
);

create index if not exists experience_bridge_sync_cursors_user_idx
  on public.experience_bridge_sync_cursors (user_id, updated_at desc);

alter table public.experience_bridge_sync_cursors enable row level security;

drop policy if exists "Bridge member read sync cursors" on public.experience_bridge_sync_cursors;
create policy "Bridge member read sync cursors"
  on public.experience_bridge_sync_cursors for select to authenticated
  using (
    user_id = auth.uid()
    and (
      public.is_experience_bridge_member(bridge_event_id, auth.uid())
      or public.is_experience_bridge_host(bridge_event_id, auth.uid())
    )
  );

drop policy if exists "Bridge member upsert own sync cursor" on public.experience_bridge_sync_cursors;
create policy "Bridge member upsert own sync cursor"
  on public.experience_bridge_sync_cursors for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_experience_bridge_member(bridge_event_id, auth.uid())
      or public.is_experience_bridge_host(bridge_event_id, auth.uid())
    )
  );

drop policy if exists "Bridge member update own sync cursor" on public.experience_bridge_sync_cursors;
create policy "Bridge member update own sync cursor"
  on public.experience_bridge_sync_cursors for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.experience_bridge_sync_cursors to authenticated;
