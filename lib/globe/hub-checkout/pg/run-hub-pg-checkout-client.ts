"use client";

import { loadStripe } from "@stripe/stripe-js";
import { ANONYMOUS, loadTossPayments } from "@tosspayments/tosspayments-sdk";
import type {
  HubPgCheckoutClientResult,
  HubPgSessionWire,
} from "@/lib/globe/hub-checkout/pg/types";
import {
  clearHubPgPendingFinalize,
  writeHubPgPendingFinalize,
} from "@/lib/globe/hub-checkout/pg/hub-pg-pending-session";
import type {
  HubCheckoutPaymentMethod,
  HubLodgingCheckoutSession,
} from "@/lib/globe/hub-checkout/types";

const MOCK_PG_DELAY_MS = 420;

function appOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}

async function fetchPgSession(
  session: HubLodgingCheckoutSession,
  paymentMethod: HubCheckoutPaymentMethod,
): Promise<HubPgSessionWire | null> {
  if (typeof window === "undefined") {
    return {
      mode: "mock",
      orderId: `hub-${session.sessionId}`,
      amountKrw: session.amountKrw,
      currency: "KRW",
      paymentMethod,
    };
  }

  const response = await fetch("/api/hub/checkout/pg-session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: session.sessionId,
      contextEventId: session.contextEventId,
      resourceId: session.resourceId,
      paymentMethod,
      amountKrw: session.amountKrw,
      orderName: `${session.propertyName} · ${session.offer.title}`,
    }),
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as HubPgSessionWire;
}

async function runMockPg(
  wire: HubPgSessionWire,
): Promise<HubPgCheckoutClientResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_PG_DELAY_MS));
  return {
    ok: true,
    externalRef: `rimvio_checkout:mock:${wire.orderId}`,
    provider: "mock",
  };
}

async function runStripePg(wire: HubPgSessionWire): Promise<HubPgCheckoutClientResult> {
  if (!wire.publishableKey || !wire.clientSecret || !wire.paymentIntentId) {
    return { ok: false, reason: "provider_unavailable" };
  }
  const stripe = await loadStripe(wire.publishableKey);
  if (!stripe) {
    return { ok: false, reason: "provider_unavailable" };
  }
  const result = await stripe.confirmPayment({
    clientSecret: wire.clientSecret,
    redirect: "if_required",
    confirmParams: {
      return_url: `${appOrigin()}/?hub_pg=success&provider=stripe&order_id=${encodeURIComponent(wire.orderId)}`,
    },
  });
  if (result.error) {
    return {
      ok: false,
      reason: result.error.type === "card_error" ? "pg_confirm_failed" : "pg_cancelled",
      message: result.error.message ?? undefined,
    };
  }
  return {
    ok: true,
    externalRef: `stripe:${wire.paymentIntentId}`,
    provider: "stripe_payment_intent",
  };
}

async function runTossPg(
  wire: HubPgSessionWire,
  session: HubLodgingCheckoutSession,
  paymentMethod: HubCheckoutPaymentMethod,
): Promise<HubPgCheckoutClientResult> {
  if (!wire.tossClientKey || !wire.orderName) {
    return { ok: false, reason: "provider_unavailable" };
  }

  writeHubPgPendingFinalize({
    sessionId: session.sessionId,
    contextEventId: session.contextEventId,
    resourceId: session.resourceId,
    paymentMethod,
    amountKrw: session.amountKrw,
    orderId: wire.orderId,
    atIso: new Date().toISOString(),
  });

  const tossPayments = await loadTossPayments(wire.tossClientKey);
  const payment = tossPayments.payment({
    customerKey: wire.customerKey ?? ANONYMOUS,
  });

  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: wire.amountKrw },
    orderId: wire.orderId,
    orderName: wire.orderName,
    successUrl:
      wire.successUrl ??
      `${appOrigin()}/?hub_pg=success&provider=toss&order_id=${encodeURIComponent(wire.orderId)}`,
    failUrl:
      wire.failUrl ??
      `${appOrigin()}/?hub_pg=fail&provider=toss&order_id=${encodeURIComponent(wire.orderId)}`,
  });

  return {
    ok: true,
    externalRef: `toss:${wire.orderId}`,
    provider: "toss_widget",
  };
}

async function runKakaoPg(
  wire: HubPgSessionWire,
  session: HubLodgingCheckoutSession,
  paymentMethod: HubCheckoutPaymentMethod,
): Promise<HubPgCheckoutClientResult> {
  writeHubPgPendingFinalize({
    sessionId: session.sessionId,
    contextEventId: session.contextEventId,
    resourceId: session.resourceId,
    paymentMethod,
    amountKrw: session.amountKrw,
    orderId: wire.orderId,
    atIso: new Date().toISOString(),
  });

  const readyResponse = await fetch("/api/hub/checkout/kakao-ready", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: wire.orderId,
      amountKrw: wire.amountKrw,
      orderName: wire.orderName,
      successUrl: wire.successUrl,
      failUrl: wire.failUrl,
    }),
  });
  if (!readyResponse.ok) {
    clearHubPgPendingFinalize();
    return { ok: false, reason: "pg_session_failed" };
  }
  const payload = (await readyResponse.json()) as { redirectUrl?: string };
  if (!payload.redirectUrl?.trim()) {
    clearHubPgPendingFinalize();
    return { ok: false, reason: "provider_unavailable" };
  }
  window.location.assign(payload.redirectUrl);
  return {
    ok: true,
    externalRef: `kakaopay:${wire.orderId}`,
    provider: "kakao_ready",
  };
}

/** Client — run PG for Hub checkout (Stripe / Toss / Kakao / mock). */
export async function runHubPgCheckoutClient(input: {
  session: HubLodgingCheckoutSession;
  paymentMethod: HubCheckoutPaymentMethod;
}): Promise<HubPgCheckoutClientResult> {
  const wire = await fetchPgSession(input.session, input.paymentMethod);
  if (!wire) {
    return { ok: false, reason: "pg_session_failed" };
  }

  if (wire.mode === "mock") {
    return runMockPg(wire);
  }
  if (wire.mode === "stripe_payment_intent") {
    return runStripePg(wire);
  }
  if (wire.mode === "toss_widget") {
    return runTossPg(wire, input.session, input.paymentMethod);
  }
  if (wire.mode === "kakao_ready") {
    return runKakaoPg(wire, input.session, input.paymentMethod);
  }

  return { ok: false, reason: "provider_unavailable" };
}
