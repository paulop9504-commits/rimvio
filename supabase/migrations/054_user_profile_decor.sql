-- Kakao/Instagram-style profile decor: status line + cover image/theme

alter table public.user_profiles
  add column if not exists status_message text,
  add column if not exists cover_url text,
  add column if not exists cover_theme text not null default 'default';

comment on column public.user_profiles.status_message is
  'Short status visible to DM peers (max ~60 chars)';
comment on column public.user_profiles.cover_url is
  'Optional profile header cover in avatars bucket';
comment on column public.user_profiles.cover_theme is
  'Preset gradient when cover_url is null: default|sky|mint|sunset|night';

alter table public.user_profiles
  drop constraint if exists user_profiles_status_message_len;

alter table public.user_profiles
  add constraint user_profiles_status_message_len
  check (status_message is null or char_length(status_message) <= 60);

alter table public.user_profiles
  drop constraint if exists user_profiles_cover_theme_check;

alter table public.user_profiles
  add constraint user_profiles_cover_theme_check
  check (cover_theme in ('default', 'sky', 'mint', 'sunset', 'night'));

create or replace function public.get_peer_public_profile(p_target_user_id uuid)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'rimvio_id', p.rimvio_id,
    'avatar_url', p.avatar_url,
    'status_message', p.status_message,
    'cover_url', p.cover_url,
    'cover_theme', p.cover_theme
  )
  from public.user_profiles p
  where p.user_id = p_target_user_id
    and auth.uid() is not null
    and p_target_user_id <> auth.uid()
    and exists (
      select 1
      from public.peer_thread_members m_self
      inner join public.peer_thread_members m_peer
        on m_self.thread_id = m_peer.thread_id
      where m_self.user_id = auth.uid()
        and m_peer.user_id = p_target_user_id
        and m_self.thread_id like 'peer-dm-%'
    )
  limit 1;
$$;

revoke all on function public.get_peer_public_profile(uuid) from public;
grant execute on function public.get_peer_public_profile(uuid) to authenticated;
