-- Rimvio SQL Editor · Verify (read-only — Run 버튼만, 저장 불필요)

-- 1) Tables exist
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'experience_bridges',
    'experience_bridge_participants',
    'experience_bridge_contributions'
  )
order by 1;

-- 2) RLS helper functions
select proname
from pg_proc
join pg_namespace n on n.oid = pg_proc.pronamespace
where n.nspname = 'public'
  and proname in (
    'is_experience_bridge_member',
    'is_experience_bridge_host'
  )
order by 1;

-- 3) Storage bucket
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'experience-bridge';

-- 4) Storage policies (expect 4)
select policyname, cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'Experience bridge%'
order by policyname;

-- 5) Bridge table policies (expect 3 + 4 + 3 — contributions includes delete)
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename like 'experience_bridge%'
order by tablename, policyname;

-- 6) Contribution delete policy (expect 1 row, cmd = DELETE)
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'experience_bridge_contributions'
  and cmd = 'DELETE';
