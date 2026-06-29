/** Field discovery tab → globe map staged pin reveal (product tier). */

import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import type { OpportunityRow } from "@/lib/globe/opportunity-field/types";
import { runStagedPinReveal } from "@/lib/globe/opportunity-field/staged-pin-reveal";

export const FIELD_DISCOVERY_PIN_SESSION = "rimvio:field-discovery-pin-session";

export type FieldDiscoveryPinSessionDetail = {
  intents: readonly MarketIntentRecord[];
  contextId: string | null;
};

export function marketIntentGlobePinId(intentId: string): string {
  return `mkt:${intentId.trim()}`;
}

export function dispatchFieldDiscoveryPinSession(
  detail: FieldDiscoveryPinSessionDetail,
): void {
  if (typeof window === "undefined" || detail.intents.length === 0) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<FieldDiscoveryPinSessionDetail>(FIELD_DISCOVERY_PIN_SESSION, {
      detail,
    }),
  );
}

export function subscribeFieldDiscoveryPinSession(
  listener: (detail: FieldDiscoveryPinSessionDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FieldDiscoveryPinSessionDetail>).detail;
    if (!detail?.intents?.length) {
      return;
    }
    listener(detail);
  };
  window.addEventListener(FIELD_DISCOVERY_PIN_SESSION, handler);
  return () => window.removeEventListener(FIELD_DISCOVERY_PIN_SESSION, handler);
}

/** Staged pop-in on globe when Field discovery rows refresh. */
export function runStagedFieldDiscoveryPinReveal(input: {
  rows: readonly OpportunityRow[];
  contextId?: string | null;
}): () => void {
  const intents = input.rows.map((row) => row.listing).filter((row) => row?.id);
  if (intents.length === 0) {
    return () => {};
  }

  dispatchFieldDiscoveryPinSession({
    intents,
    contextId: input.contextId ?? null,
  });

  return runStagedPinReveal({
    items: intents.map((intent) => ({ id: marketIntentGlobePinId(intent.id) })),
  });
}
