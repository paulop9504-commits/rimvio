import {
  hubPgProviderLabel,
  resolveHubPgMode,
} from "@/lib/globe/hub-checkout/pg/resolve-hub-pg-mode";
import type { HubPgSessionWire } from "@/lib/globe/hub-checkout/pg/types";
import type { HubCheckoutPaymentMethod } from "@/lib/globe/hub-checkout/types";

export type CreateHubPgSessionInput = {
  sessionId: string;
  contextEventId: string;
  resourceId: string;
  paymentMethod: HubCheckoutPaymentMethod;
  amountKrw: number;
  orderName: string;
  successUrl: string;
  failUrl: string;
};

function buildOrderId(sessionId: string): string {
  const compact = sessionId.replace(/[^a-zA-Z0-9]/gu, "").slice(0, 24);
  return `hub${compact}${Date.now().toString(36)}`.slice(0, 64);
}

async function createStripePaymentIntent(
  input: CreateHubPgSessionInput,
  orderId: string,
): Promise<HubPgSessionWire> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!secret || !publishableKey) {
    return {
      mode: "mock",
      orderId,
      amountKrw: input.amountKrw,
      currency: "KRW",
      paymentMethod: input.paymentMethod,
      fallbackReason: "stripe_keys_missing",
    };
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secret);
  const intent = await stripe.paymentIntents.create({
    amount: input.amountKrw,
    currency: "krw",
    automatic_payment_methods: { enabled: true },
    metadata: {
      hubCheckoutSessionId: input.sessionId,
      contextEventId: input.contextEventId,
      resourceId: input.resourceId,
      orderId,
    },
    description: input.orderName,
  });

  if (!intent.client_secret) {
    throw new Error("stripe_client_secret_missing");
  }

  return {
    mode: "stripe_payment_intent",
    orderId,
    amountKrw: input.amountKrw,
    currency: "KRW",
    paymentMethod: input.paymentMethod,
    publishableKey,
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    orderName: input.orderName,
  };
}

function createTossSession(
  input: CreateHubPgSessionInput,
  orderId: string,
): HubPgSessionWire {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim();
  if (!clientKey) {
    return {
      mode: "mock",
      orderId,
      amountKrw: input.amountKrw,
      currency: "KRW",
      paymentMethod: input.paymentMethod,
      fallbackReason: "toss_client_key_missing",
    };
  }

  return {
    mode: "toss_widget",
    orderId,
    amountKrw: input.amountKrw,
    currency: "KRW",
    paymentMethod: input.paymentMethod,
    tossClientKey: clientKey,
    customerKey: `rimvio_${input.contextEventId.slice(0, 24)}`,
    orderName: input.orderName,
    successUrl: input.successUrl,
    failUrl: input.failUrl,
  };
}

function createKakaoSession(
  input: CreateHubPgSessionInput,
  orderId: string,
): HubPgSessionWire {
  const cid = process.env.KAKAO_PAY_CID?.trim();
  const secret = process.env.KAKAO_PAY_SECRET?.trim();
  if (!cid || !secret) {
    return {
      mode: "mock",
      orderId,
      amountKrw: input.amountKrw,
      currency: "KRW",
      paymentMethod: input.paymentMethod,
      fallbackReason: "kakao_pay_keys_missing",
    };
  }

  return {
    mode: "kakao_ready",
    orderId,
    amountKrw: input.amountKrw,
    currency: "KRW",
    paymentMethod: input.paymentMethod,
    orderName: input.orderName,
    successUrl: input.successUrl,
    failUrl: input.failUrl,
  };
}

/** Server — create provider session (Stripe PI / Toss widget / mock). */
export async function createHubPgSession(
  input: CreateHubPgSessionInput,
): Promise<HubPgSessionWire> {
  const orderId = buildOrderId(input.sessionId);
  const mode = resolveHubPgMode(input.paymentMethod);

  if (mode === "stripe_payment_intent") {
    return createStripePaymentIntent(input, orderId);
  }
  if (mode === "toss_widget") {
    return createTossSession(input, orderId);
  }
  if (mode === "kakao_ready") {
    return createKakaoSession(input, orderId);
  }

  return {
    mode: "mock",
    orderId,
    amountKrw: input.amountKrw,
    currency: "KRW",
    paymentMethod: input.paymentMethod,
    fallbackReason: `${hubPgProviderLabel(mode)}_fallback`,
  };
}
