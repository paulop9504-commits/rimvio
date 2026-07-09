"use client";

import { buildLiteApiGuestPayload } from "@/lib/globe/context-hub/providers/liteapi/build-liteapi-guest-payload";
import {
  clearLiteApiPendingCheckout,
  writeLiteApiPendingCheckout,
} from "@/lib/globe/hub-checkout/liteapi/liteapi-pending-checkout";
import type { HubLodgingCheckoutSession } from "@/lib/globe/hub-checkout/types";
import type { IdentityVaultBundle } from "@/lib/identity-vault/types";

const PAYMENT_SCRIPT =
  "https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1";

type LiteApiPaymentCtor = new (config: Record<string, unknown>) => {
  handlePayment: () => void;
};

declare global {
  interface Window {
    LiteAPIPayment?: LiteApiPaymentCtor;
  }
}

function appOrigin(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}

function loadLiteApiPaymentScript(): Promise<void> {
  if (window.LiteAPIPayment) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PAYMENT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("liteapi_script_failed")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = PAYMENT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("liteapi_script_failed"));
    document.head.appendChild(script);
  });
}

export type LiteApiCheckoutClientResult =
  | { ok: true; purchaseDeferred: true }
  | { ok: false; reason: string; message?: string };

/** Client — prebook + Nuitee Payment SDK (redirect → book on return). */
export async function runLiteApiCheckoutClient(input: {
  session: HubLodgingCheckoutSession;
  identityBundle: IdentityVaultBundle;
  paymentTargetSelector: string;
}): Promise<LiteApiCheckoutClientResult> {
  const offerId = input.session.liteapiOfferId?.trim();
  if (!offerId) {
    return { ok: false, reason: "missing_offer" };
  }

  const guest = buildLiteApiGuestPayload(input.identityBundle);
  if (!guest) {
    return { ok: false, reason: "missing_identity" };
  }

  const returnUrl = `${appOrigin()}/?hub_liteapi=return&session_id=${encodeURIComponent(input.session.sessionId)}`;

  const prebookResponse = await fetch("/api/hub/checkout/liteapi/prebook", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offerId,
      returnUrl,
      sessionId: input.session.sessionId,
      contextEventId: input.session.contextEventId,
      resourceId: input.session.resourceId,
      propertyName: input.session.propertyName,
      offerTitle: input.session.offer.title,
      amountKrw: input.session.amountKrw,
    }),
  });

  if (!prebookResponse.ok) {
    return { ok: false, reason: "prebook_failed" };
  }

  const prebook = (await prebookResponse.json()) as {
    prebookId?: string;
    transactionId?: string;
    secretKey?: string;
    publicKey?: "live" | "sandbox";
  };

  const prebookId = prebook.prebookId?.trim();
  const transactionId = prebook.transactionId?.trim();
  const secretKey = prebook.secretKey?.trim();
  if (!prebookId || !transactionId || !secretKey) {
    clearLiteApiPendingCheckout();
    return { ok: false, reason: "prebook_incomplete" };
  }

  writeLiteApiPendingCheckout({
    sessionId: input.session.sessionId,
    contextEventId: input.session.contextEventId,
    resourceId: input.session.resourceId,
    prebookId,
    transactionId,
    amountKrw: input.session.amountKrw,
    propertyName: input.session.propertyName,
    offerTitle: input.session.offer.title,
    atIso: new Date().toISOString(),
  });

  await loadLiteApiPaymentScript();
  const PaymentCtor = window.LiteAPIPayment;
  if (!PaymentCtor) {
    clearLiteApiPendingCheckout();
    return { ok: false, reason: "payment_sdk_unavailable" };
  }

  const payment = new PaymentCtor({
    publicKey: prebook.publicKey ?? "live",
    secretKey,
    returnUrl,
    targetElement: input.paymentTargetSelector,
    appearance: { theme: "flat" },
    options: {
      business: { name: "Rimvio" },
    },
  });
  payment.handlePayment();

  return { ok: true, purchaseDeferred: true };
}
