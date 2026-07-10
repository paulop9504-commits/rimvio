-- Identity Vault — traveler / passport / license / contact (+ opt-in sensitive id)
-- Extends user_vault_objects.kind (see docs/RIMVIO_IDENTITY_VAULT.md)

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
      'identity_sensitive_national_id'
    )
  );
