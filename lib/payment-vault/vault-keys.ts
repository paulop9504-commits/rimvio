import type { PaymentVaultKind } from "@/lib/payment-vault/types";

const PRIMARY = "primary";

export const PAYMENT_VAULT_KEYS = {
  preference: `payment:preference:${PRIMARY}`,
} as const;

export function paymentVaultKindForKey(objectKey: string): PaymentVaultKind | null {
  if (objectKey.trim() === PAYMENT_VAULT_KEYS.preference) {
    return "payment_preference";
  }
  return null;
}
