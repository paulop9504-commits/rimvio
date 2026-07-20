-- Shared (anonymous) seed-learning aggregate — community hit/miss for Dictionary promote.
-- No user_id / session_id / raw utterance — tokens + counts only.
-- Idempotent: safe to re-run in SQL Editor.

create table if not exists public.seed_learning_aggregate (
  id uuid primary key default gen_random_uuid(),
  sector_id text not null,
  token text not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  miss_count integer not null default 0 check (miss_count >= 0),
  sample_domains text[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint seed_learning_aggregate_sector_token_unique unique (sector_id, token)
);

create index if not exists seed_learning_aggregate_miss_idx
  on public.seed_learning_aggregate (miss_count desc, hit_count desc);

create index if not exists seed_learning_aggregate_sector_idx
  on public.seed_learning_aggregate (sector_id, miss_count desc);

alter table public.seed_learning_aggregate enable row level security;

drop policy if exists "Public read seed learning aggregate"
  on public.seed_learning_aggregate;

create policy "Public read seed learning aggregate"
  on public.seed_learning_aggregate for select to anon, authenticated using (true);

-- Atomic bump — preferred over client read-modify-write.
create or replace function public.bump_seed_learning_aggregate(
  p_sector_id text,
  p_token text,
  p_hit_delta integer,
  p_miss_delta integer,
  p_domain text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hit_d integer := greatest(coalesce(p_hit_delta, 0), 0);
  miss_d integer := greatest(coalesce(p_miss_delta, 0), 0);
  domain_arr text[] := case
    when p_domain is null or length(trim(p_domain)) = 0 then '{}'::text[]
    else array[trim(p_domain)]
  end;
begin
  if p_sector_id is null or length(trim(p_sector_id)) = 0 then
    return;
  end if;
  if p_token is null or length(trim(p_token)) < 2 then
    return;
  end if;
  if hit_d = 0 and miss_d = 0 then
    return;
  end if;

  insert into public.seed_learning_aggregate as t (
    sector_id,
    token,
    hit_count,
    miss_count,
    sample_domains,
    updated_at
  )
  values (
    trim(p_sector_id),
    lower(trim(p_token)),
    hit_d,
    miss_d,
    domain_arr,
    timezone('utc', now())
  )
  on conflict (sector_id, token) do update
  set
    hit_count = t.hit_count + hit_d,
    miss_count = t.miss_count + miss_d,
    sample_domains = (
      select coalesce(array_agg(distinct d), '{}'::text[])
      from unnest(t.sample_domains || domain_arr) as d
      where d is not null and length(d) > 0
    ),
    updated_at = timezone('utc', now());
end;
$$;

revoke all on function public.bump_seed_learning_aggregate(text, text, integer, integer, text) from public;
grant execute on function public.bump_seed_learning_aggregate(text, text, integer, integer, text) to anon, authenticated;
