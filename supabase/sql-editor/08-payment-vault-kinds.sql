-- Payment Vault kinds (run in Supabase SQL editor if migration not applied)
-- @see supabase/migrations/066_payment_vault_kinds.sql

alter table public.user_vault_objects
  drop constraint if exists user_vault_objects_kind_check;

alter table public.user_vault_objects
  add constraint user_vault_objects_kind_check check (
    kind in (
      'life_event',
      'capture',
      'media_blob',
      'preferences',
      'sync_cursor',
      'identity_traveler_profile',
      'identity_passport',
      'identity_driver_license',
      'identity_contact',
      'identity_sensitive_national_id',
      'payment_preference'
    )
  );
