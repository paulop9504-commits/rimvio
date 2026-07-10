export const OPEN_PAYMENT_VAULT_SETTINGS_EVENT = "rimvio:open-payment-vault-settings";

export function openPaymentVaultSettings(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(OPEN_PAYMENT_VAULT_SETTINGS_EVENT));
}

export function subscribeOpenPaymentVaultSettings(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => listener();
  window.addEventListener(OPEN_PAYMENT_VAULT_SETTINGS_EVENT, handler);
  return () => window.removeEventListener(OPEN_PAYMENT_VAULT_SETTINGS_EVENT, handler);
}
