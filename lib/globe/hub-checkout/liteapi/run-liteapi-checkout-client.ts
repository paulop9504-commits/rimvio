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

const checkoutInFlightSessionIds = new Set<string>();

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
  const sessionId = input.session.sessionId.trim();
  if (checkoutInFlightSessionIds.has(sessionId)) {
    return { ok: false, reason: "checkout_in_flight" };
  }

  const lockedEarly = input.session.liteapiLockedPrebook;
  const offerId = input.session.liteapiOfferId?.trim();
  const hasLocked =
    Boolean(lockedEarly?.prebookId?.trim()) &&
    Boolean(lockedEarly?.transactionId?.trim()) &&
    Boolean(lockedEarly?.secretKey?.trim());
  if (!offerId && !hasLocked) {
    return { ok: false, reason: "missing_offer" };
  }

  if (typeof document !== "undefined") {
    const target = document.querySelector(input.paymentTargetSelector);
    if (!target) {
      return { ok: false, reason: "payment_target_missing" };
    }
  }

  checkoutInFlightSessionIds.add(sessionId);

  const guest = buildLiteApiGuestPayload(input.identityBundle);
  if (!guest) {
    checkoutInFlightSessionIds.delete(sessionId);
    return { ok: false, reason: "missing_identity" };
  }

  const returnUrl = `${appOrigin()}/?hub_liteapi=return&session_id=${encodeURIComponent(input.session.sessionId)}`;

  const locked = input.session.liteapiLockedPrebook;
  let prebookId: string | undefined;
  let transactionId: string | undefined;
  let secretKey: string | undefined;
  let publicKey: "live" | "sandbox" | undefined;

  if (
    locked?.prebookId?.trim() &&
    locked.transactionId?.trim() &&
    locked.secretKey?.trim()
  ) {
    prebookId = locked.prebookId.trim();
    transactionId = locked.transactionId.trim();
    secretKey = locked.secretKey.trim();
    publicKey = locked.publicKey ?? "live";
  } else {
    const offerId = input.session.liteapiOfferId?.trim();
    if (!offerId) {
      checkoutInFlightSessionIds.delete(sessionId);
      return { ok: false, reason: "missing_offer" };
    }

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
      checkoutInFlightSessionIds.delete(sessionId);
      return { ok: false, reason: "prebook_failed" };
    }

    const prebook = (await prebookResponse.json()) as {
      prebookId?: string;
      transactionId?: string;
      secretKey?: string;
      publicKey?: "live" | "sandbox";
    };

    prebookId = prebook.prebookId?.trim();
    transactionId = prebook.transactionId?.trim();
    secretKey = prebook.secretKey?.trim();
    publicKey = prebook.publicKey ?? "live";
  }

  if (!prebookId || !transactionId || !secretKey) {
    clearLiteApiPendingCheckout();
    checkoutInFlightSessionIds.delete(sessionId);
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

  try {
    await loadLiteApiPaymentScript();
  } catch {
    clearLiteApiPendingCheckout();
    checkoutInFlightSessionIds.delete(sessionId);
    return { ok: false, reason: "payment_sdk_unavailable" };
  }
  const PaymentCtor = window.LiteAPIPayment;
  if (!PaymentCtor) {
    clearLiteApiPendingCheckout();
    checkoutInFlightSessionIds.delete(sessionId);
    return { ok: false, reason: "payment_sdk_unavailable" };
  }

  const payment = new PaymentCtor({
    publicKey: publicKey ?? "live",
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
