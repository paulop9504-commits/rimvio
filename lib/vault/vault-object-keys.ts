/** Stable vault object keys — Phase 2 sync helpers. */

export function lifeEventVaultKey(eventId: string): string {
  return `life_event:${eventId.trim()}`;
}

export function captureVaultKey(eventId: string, captureId: string): string {
  return `capture:${eventId.trim()}:${captureId.trim()}`;
}

export function mediaBlobVaultKey(mediaContextId: string): string {
  return `media_blob:${mediaContextId.trim()}`;
}

export function vaultSyncCursorKey(scope: string): string {
  return `sync_cursor:${scope.trim()}`;
}

export {
  IDENTITY_VAULT_KEYS,
  identityVaultKindForKey,
} from "@/lib/identity-vault/vault-keys";
