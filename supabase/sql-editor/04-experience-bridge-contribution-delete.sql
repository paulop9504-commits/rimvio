-- Rimvio SQL Editor · Script 4/4
-- Experience Bridge — 본인 공유 사진·동영상 삭제 (migration 043)
-- Requires Script 1–2 first. Safe to re-run.

drop policy if exists "Contributor delete experience_bridge_contributions"
  on public.experience_bridge_contributions;

create policy "Contributor delete experience_bridge_contributions"
  on public.experience_bridge_contributions for delete to authenticated
  using (contributor_user_id = auth.uid());
