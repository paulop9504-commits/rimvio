import { PAYMENT_VAULT_KEYS } from "@/lib/payment-vault/vault-keys";
import type { PaymentPreferencePayload, PaymentVaultBundle } from "@/lib/payment-vault/types";

async function readObject<T>(objectKey: string): Promise<T | null> {
  const response = await fetch(
    `/api/vault/objects?objectKey=${encodeURIComponent(objectKey)}`,
    { credentials: "same-origin" },
  );
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { payload?: T };
  return body.payload ?? null;
}

/** Client helper — loads saved payment preference when user taps express checkout. */
export async function readPaymentVaultBundleClient(): Promise<PaymentVaultBundle> {
  const preference = await readObject<PaymentPreferencePayload>(
    PAYMENT_VAULT_KEYS.preference,
  );
  return {
    preference: preference ?? undefined,
  };
}
