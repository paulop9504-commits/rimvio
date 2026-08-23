-- Phase D: WAITING timeout + install job progress

alter table public.pc_local_agent_tasks
  add column if not exists waiting_expires_at timestamptz;

create index if not exists pc_local_agent_tasks_waiting_expires_idx
  on public.pc_local_agent_tasks (status, waiting_expires_at)
  where status = 'WAITING';

alter table public.pc_local_agent_install_jobs
  add column if not exists progress_pct int not null default 0
    check (progress_pct >= 0 and progress_pct <= 100);

-- Realtime for install job progress (if not already added)
do $$
begin
  alter publication supabase_realtime add table public.pc_local_agent_capabilities;
exception
  when duplicate_object then null;
end $$;
