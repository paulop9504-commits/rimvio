import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";

export type HubPgSessionMode =
  | "mock"
  | "stripe_payment_intent"
  | "toss_widget"
  | "kakao_ready";

export type HubPgSessionWire = {
  readonly mode: HubPgSessionMode;
  readonly orderId: string;
  readonly amountKrw: number;
  readonly currency: "KRW";
  readonly paymentMethod: HubCheckoutPaymentMethod;
  readonly publishableKey?: string;
  readonly clientSecret?: string;
  readonly paymentIntentId?: string;
  readonly tossClientKey?: string;
  readonly customerKey?: string;
  readonly orderName?: string;
  readonly successUrl?: string;
  readonly failUrl?: string;
  readonly fallbackReason?: string;
};

export type HubPgCheckoutClientResult =
  | {
      readonly ok: true;
      readonly externalRef: string;
      readonly provider: HubPgSessionMode;
    }
  | {
      readonly ok: false;
      readonly reason:
        | "pg_session_failed"
        | "pg_cancelled"
        | "pg_confirm_failed"
        | "provider_unavailable";
      readonly message?: string;
    };

export type HubPgPendingFinalize = {
  readonly sessionId: string;
  readonly contextEventId: string;
  readonly resourceId: string;
  readonly paymentMethod: HubCheckoutPaymentMethod;
  readonly amountKrw: number;
  readonly orderId: string;
  readonly atIso: string;
};
