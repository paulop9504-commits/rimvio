/**
 * Mint / refresh a marketplace (used_goods) Context event — same SSOT as travel pins.
 * @see docs/adr/032-marketplace-as-context-type.md
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { createPersonalGlobePinFromEvent } from "@/lib/globe/create-personal-globe-pin";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { classifyMarketWorkspaceRole } from "@/lib/workspace-kind/classify-workspace-kind";

export function ensureMarketContextEvent(input: {
  readonly utterance: string;
  readonly existingEventId?: string | null;
  readonly role?: "sell" | "buy" | null;
}): EventCandidate {
  const message = input.utterance.trim();
  const role = input.role ?? classifyMarketWorkspaceRole(message);
  const productRaw = parseMarketProductFromText(message).productName;
  const product = isValidMarketProductName(productRaw) ? productRaw.trim() : "";
  const title = product
    ? role === "sell"
      ? `${product} 판매`
      : `${product} 구매`
    : role === "sell"
      ? "중고 판매"
      : "중고 구매";

  const eventId =
    input.existingEventId?.trim() || `ctx-market:${Date.now()}`;

  const event = commitEventUpsert({
    id: eventId,
    title,
    category: "custom",
    source: "manual",
    lifecycle: "scheduled",
    confidence: 0.85,
    metadata: {
      globeManualContext: true,
      workspaceKind: "used_goods",
      marketRole: role === "sell" ? "listing" : "seeking",
      marketProductName: product || null,
      sourceMessage: message,
      targetingSource: "workspace_intent_continuum",
    },
  });

  createPersonalGlobePinFromEvent({ event });
  return event;
}

