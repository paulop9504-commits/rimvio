import type { VaultObjectKind } from "@/lib/vault/types";
import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";
import type { PaymentPreferencePayload } from "@/lib/payment-vault/types";

const ALLOWED_METHODS: readonly HubCheckoutPaymentMethod[] = [
  "in_app_card",
  "kakaopay",
  "tosspay",
];

export function validatePaymentVaultPut(kind: VaultObjectKind, payload: unknown): void {
  if (kind !== "payment_preference") {
    return;
  }
  const row = payload as Partial<PaymentPreferencePayload>;
  if (row.version !== 1) {
    throw new Error("payment_vault_invalid_version");
  }
  if (!row.method || !ALLOWED_METHODS.includes(row.method)) {
    throw new Error("payment_vault_invalid_method");
  }
  const label = row.displayLabelKo?.trim();
  if (!label) {
    throw new Error("payment_vault_missing_label");
  }
  if (label.length > 64) {
    throw new Error("payment_vault_label_too_long");
  }
  const providerRef = row.providerRef?.trim();
  if (providerRef && providerRef.length > 256) {
    throw new Error("payment_vault_provider_ref_too_long");
  }
  const last4 = row.cardLast4?.trim();
  if (last4 && !/^\d{4}$/u.test(last4)) {
    throw new Error("payment_vault_invalid_card_last4");
  }
}
