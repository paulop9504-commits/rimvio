-- Dual approval + Realtime for agent coordination rooms

alter table public.market_agent_coordination_rooms
  add column if not exists seeking_approved_at timestamptz,
  add column if not exists listing_approved_at timestamptz;

do $$
begin
  alter publication supabase_realtime add table public.market_agent_coordination_rooms;
exception
  when duplicate_object then
    null;
end $$;
