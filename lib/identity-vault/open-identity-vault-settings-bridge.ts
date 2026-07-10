/** Open Settings > 여행 신원 from Globe checkout (event bridge). */

export const IDENTITY_VAULT_SETTINGS_OPEN_EVENT = "rimvio:open-identity-vault-settings";

export function openIdentityVaultSettings(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(IDENTITY_VAULT_SETTINGS_OPEN_EVENT));
}

export function subscribeIdentityVaultSettingsOpen(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(IDENTITY_VAULT_SETTINGS_OPEN_EVENT, listener);
  return () => window.removeEventListener(IDENTITY_VAULT_SETTINGS_OPEN_EVENT, listener);
}
