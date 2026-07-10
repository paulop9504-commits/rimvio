import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";
import { buildPaymentDisplayLabel } from "@/lib/payment-vault/build-payment-display-label";
import type { PaymentPreferencePayload } from "@/lib/payment-vault/types";
import { PAYMENT_VAULT_KEYS } from "@/lib/payment-vault/vault-keys";
import { upsertPaymentVaultObjectClient } from "@/lib/payment-vault/write-payment-vault-object-client";

export async function savePaymentPreferenceClient(input: {
  method: HubCheckoutPaymentMethod;
  cardLast4?: string | null;
  cardBrand?: string | null;
  providerRef?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: PaymentPreferencePayload = {
    version: 1,
    method: input.method,
    displayLabelKo: buildPaymentDisplayLabel({
      method: input.method,
      cardLast4: input.cardLast4,
      cardBrand: input.cardBrand,
    }),
    providerRef: input.providerRef?.trim() || null,
    cardBrand: input.cardBrand?.trim() || null,
    cardLast4: input.cardLast4?.trim() || null,
    savedAtIso: new Date().toISOString(),
  };

  return upsertPaymentVaultObjectClient({
    objectKey: PAYMENT_VAULT_KEYS.preference,
    kind: "payment_preference",
    payload,
  });
}
