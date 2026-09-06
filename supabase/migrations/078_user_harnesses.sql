-- Personal Harness library — owner-scoped SSOT (RLS).
-- Drafts may stay in localStorage; durable publish/store uses this table.
-- enabled = runtime on/off without deleting the harness.

create table if not exists public.user_harnesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  harness_id text not null,
  harness jsonb not null,
  enabled boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, harness_id)
);

create index if not exists user_harnesses_user_updated_idx
  on public.user_harnesses (user_id, updated_at desc);

create index if not exists user_harnesses_user_enabled_idx
  on public.user_harnesses (user_id, enabled)
  where enabled = true;

alter table public.user_harnesses enable row level security;

create policy "Users read own harnesses"
  on public.user_harnesses for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own harnesses"
  on public.user_harnesses for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own harnesses"
  on public.user_harnesses for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own harnesses"
  on public.user_harnesses for delete to authenticated
  using (auth.uid() = user_id);

-- Public published listings (marketplace-ready later). Owners still manage via own policies.
create policy "Anyone authenticated can read public published harnesses"
  on public.user_harnesses for select to authenticated
  using (visibility = 'public' and status = 'published' and enabled = true);
