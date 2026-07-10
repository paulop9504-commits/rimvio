import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";
import type { HubPgSessionMode } from "@/lib/globe/hub-checkout/pg/types";

export function resolveHubPgMode(
  paymentMethod: HubCheckoutPaymentMethod,
): HubPgSessionMode {
  if (paymentMethod === "in_app_card") {
    if (
      process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
    ) {
      return "stripe_payment_intent";
    }
    return "mock";
  }
  if (paymentMethod === "tosspay") {
    if (process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim()) {
      return "toss_widget";
    }
    return "mock";
  }
  if (paymentMethod === "kakaopay") {
    if (process.env.KAKAO_PAY_CID?.trim() && process.env.KAKAO_PAY_SECRET?.trim()) {
      return "kakao_ready";
    }
    return "mock";
  }
  return "mock";
}

export function hubPgProviderLabel(mode: HubPgSessionMode): string {
  switch (mode) {
    case "stripe_payment_intent":
      return "stripe";
    case "toss_widget":
      return "toss";
    case "kakao_ready":
      return "kakaopay";
    default:
      return "mock";
  }
}
