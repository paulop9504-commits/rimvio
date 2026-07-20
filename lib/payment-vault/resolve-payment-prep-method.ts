/**
 * Resolve saved payment preference for payment_prep Field / Commit.
 */

import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";
import type { PaymentPreferencePayload } from "@/lib/payment-vault/types";
import { buildPaymentDisplayLabel } from "@/lib/payment-vault/build-payment-display-label";

export type ResolvedPaymentPrepMethod = {
  readonly method: HubCheckoutPaymentMethod;
  readonly labelKo: string;
  readonly providerRef: string | null;
};

export function resolvePaymentPrepMethodFromPreference(
  preference: PaymentPreferencePayload | null | undefined,
): ResolvedPaymentPrepMethod | null {
  if (!preference?.method) {
    return null;
  }
  const labelKo =
    preference.displayLabelKo?.trim() ||
    buildPaymentDisplayLabel({
      method: preference.method,
      cardLast4: preference.cardLast4,
      cardBrand: preference.cardBrand,
    });
  return {
    method: preference.method,
    labelKo,
    providerRef: preference.providerRef?.trim() || null,
  };
}
