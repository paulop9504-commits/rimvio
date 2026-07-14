-- Provider Network member directory — derived index synced from marketplace manifests.
-- Wire SSOT remains manifest embed (providerMemberId); this table is server cache / cross-device read.
-- @see docs/RIMVIO_PROVIDER_NETWORK.md · docs/RIMVIO_STACK_ALIGNMENT.md

create table if not exists public.provider_network_members (
  member_id text primary key,
  kind text not null check (kind in ('producer', 'worker', 'organization', 'ai_agent')),
  display_label text not null,
  capability_ids text[] not null default '{}',
  engine_manifest_ids text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists provider_network_members_kind_idx
  on public.provider_network_members (kind, display_label);

alter table public.provider_network_members enable row level security;

create policy "Authenticated read provider network members"
  on public.provider_network_members
  for select
  to authenticated
  using (true);

grant select on public.provider_network_members to authenticated;
