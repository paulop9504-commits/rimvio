import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";
import { copy } from "@/lib/copy/human-ko";

export function buildPaymentDisplayLabel(input: {
  method: HubCheckoutPaymentMethod;
  cardLast4?: string | null;
  cardBrand?: string | null;
}): string {
  if (input.method === "kakaopay") {
    return copy.paymentVault.methodKakao;
  }
  if (input.method === "tosspay") {
    return copy.paymentVault.methodToss;
  }
  const last4 = input.cardLast4?.trim();
  if (last4 && /^\d{4}$/u.test(last4)) {
    return copy.paymentVault.methodCardMasked(last4);
  }
  return copy.paymentVault.methodCard;
}
