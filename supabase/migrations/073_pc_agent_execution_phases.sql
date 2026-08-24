-- PC agent task status = 16 execution phases (Cloud SSOT).
-- WAITING + CREATED kept for rows not yet backfilled.

alter table public.pc_local_agent_tasks
  drop constraint if exists pc_local_agent_tasks_status_check;

alter table public.pc_local_agent_tasks
  add constraint pc_local_agent_tasks_status_check
  check (status in (
    'CREATED',
    'QUEUED',
    'DISPATCHED',
    'RUNNING',
    'BROWSER_OPENED',
    'PAGE_READY',
    'ACTION_RUNNING',
    'WAITING_USER',
    'APPROVED',
    'VERIFYING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'PAUSED',
    'PC_OFFLINE',
    'AUTH_REQUIRED',
    'HUMAN_REQUIRED',
    'WAITING'
  ));

update public.pc_local_agent_tasks
set status = result->>'phase'
where coalesce(result->>'phase', '') in (
  'QUEUED',
  'DISPATCHED',
  'RUNNING',
  'BROWSER_OPENED',
  'PAGE_READY',
  'ACTION_RUNNING',
  'WAITING_USER',
  'APPROVED',
  'VERIFYING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'PAUSED',
  'PC_OFFLINE',
  'AUTH_REQUIRED',
  'HUMAN_REQUIRED'
)
and status is distinct from (result->>'phase');

update public.pc_local_agent_tasks
set status = 'WAITING_USER'
where status = 'WAITING'
  and coalesce(result->>'phase', '') in ('WAITING_USER', '');
