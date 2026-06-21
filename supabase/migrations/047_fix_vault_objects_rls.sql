-- Fix vault object upsert under RLS (ON CONFLICT DO UPDATE needs USING on UPDATE policy)

drop policy if exists "Vault owner update user_vault_objects" on public.user_vault_objects;
create policy "Vault owner update user_vault_objects"
  on public.user_vault_objects for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_vault_objects to authenticated;
grant select, insert, update on public.user_vaults to authenticated;
