"use client";

import { dispatchCapability } from "@/lib/capability-registry";
import { openLodgingHubCheckout } from "@/lib/globe/hub-checkout/open-lodging-hub-checkout-bridge";
import { readPinnedLodgingPlaceId } from "@/lib/globe/finance-prep/read-finance-prep-checkout-target";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { openPaymentVaultSettings } from "@/lib/payment-vault/open-payment-vault-settings-bridge";

export type OpenFinancePaymentFieldResult = {
  readonly opened: boolean;
  readonly mode: "lodging_checkout" | "payment_vault" | "capability_only";
  readonly capabilityDispatched: boolean;
  readonly placeId: string | null;
};

/** Field path — lodging checkout sheet or payment vault + capability handoff. */
export function openFinancePaymentFieldClient(input: {
  contextEventId: string;
  event?: EventCandidate | null;
  budgetBand?: string | null;
  title?: string | null;
}): OpenFinancePaymentFieldResult {
  const event =
    input.event ?? findLifeEventCandidate(input.contextEventId) ?? null;
  const placeId = readPinnedLodgingPlaceId(event);
  const title = input.title?.trim() || event?.title?.trim() || "결제 준비";

  const capability = dispatchCapability({
    capabilityId: "BOOK_HOTEL",
    inputs: {
      title,
      budget: input.budgetBand ?? "",
    },
    metadata: {
      surfaceId: input.contextEventId,
      eventId: input.contextEventId,
    },
  });

  if (placeId) {
    const opened = openLodgingHubCheckout({
      contextEventId: input.contextEventId,
      placeId,
    });
    if (opened) {
      return {
        opened: true,
        mode: "lodging_checkout",
        capabilityDispatched: capability.ok,
        placeId,
      };
    }
  }

  if (typeof window !== "undefined") {
    openPaymentVaultSettings();
  }

  return {
    opened: true,
    mode: placeId ? "capability_only" : "payment_vault",
    capabilityDispatched: capability.ok,
    placeId,
  };
}
