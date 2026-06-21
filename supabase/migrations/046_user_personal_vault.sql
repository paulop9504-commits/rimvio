-- Rimvio Personal Vault — per-user tenant boundary + encrypted object store
-- Phase 1: logical multi-tenant (user_id) + private storage bucket

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenant root (1:1 auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.user_vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'locked', 'purged')),
  storage_quota_bytes bigint not null default 5368709120,
  storage_used_bytes bigint not null default 0 check (storage_used_bytes >= 0),
  crypto_scheme text not null default 'server_v1',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_vault_objects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  object_key text not null,
  kind text not null check (
    kind in ('life_event', 'capture', 'media_blob', 'preferences', 'sync_cursor')
  ),
  storage_bucket text not null default 'personal-vault',
  storage_path text,
  ciphertext_inline text,
  content_type text,
  byte_size bigint not null default 0 check (byte_size >= 0),
  content_hash text,
  encryption_version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_vault_objects_owner_key unique (user_id, object_key),
  constraint user_vault_objects_payload_check check (
    storage_path is not null or ciphertext_inline is not null
  )
);

create index if not exists user_vault_objects_user_kind_updated_idx
  on public.user_vault_objects (user_id, kind, updated_at desc);

alter table public.user_vaults enable row level security;
alter table public.user_vault_objects enable row level security;

-- Owner-only — no anon, no public read
create policy "Vault owner read user_vaults"
  on public.user_vaults for select to authenticated
  using (auth.uid() = user_id);

create policy "Vault owner insert user_vaults"
  on public.user_vaults for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Vault owner update user_vaults"
  on public.user_vaults for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Vault owner read user_vault_objects"
  on public.user_vault_objects for select to authenticated
  using (auth.uid() = user_id);

create policy "Vault owner insert user_vault_objects"
  on public.user_vault_objects for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Vault owner update user_vault_objects"
  on public.user_vault_objects for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Vault owner delete user_vault_objects"
  on public.user_vault_objects for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Provision vault on demand (called from API after auth)
-- ---------------------------------------------------------------------------
create or replace function public.rimvio_ensure_user_vault(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return false;
  end if;

  if auth.uid() is distinct from p_user_id then
    raise exception 'forbidden';
  end if;

  insert into public.user_vaults (user_id)
  values (p_user_id)
  on conflict (user_id) do update
    set updated_at = timezone('utc', now());

  return true;
end;
$$;

revoke all on function public.rimvio_ensure_user_vault(uuid) from public;
grant execute on function public.rimvio_ensure_user_vault(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Private object storage (encrypted blobs — not bridge public media)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'personal-vault',
  'personal-vault',
  false,
  83886080,
  array[
    'application/octet-stream',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Personal vault owner read" on storage.objects;
create policy "Personal vault owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'personal-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Personal vault owner insert" on storage.objects;
create policy "Personal vault owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'personal-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Personal vault owner update" on storage.objects;
create policy "Personal vault owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'personal-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'personal-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Personal vault owner delete" on storage.objects;
create policy "Personal vault owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'personal-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
