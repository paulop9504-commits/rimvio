import type { EventCandidate } from "@/lib/events/event-candidate";
import { classifyPinDomainFromText } from "@/lib/globe/classify-pin-domain";
import { findMarketIntentByEventId } from "@/lib/globe/market/market-alignment-store";
import { isMarketIntentPublishedExternal } from "@/lib/globe/market/market-intent-detail";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import type { PortalIntentId } from "@/lib/portal/portal-types";

export type PortalMarketSuggestionKind = "create_projection" | "publish_external";

export type PortalMarketSuggestion = {
  kind: PortalMarketSuggestionKind;
  eventId: string;
  portalIntentId: PortalIntentId;
  role: MarketIntentRole;
  productName: string;
  seedText: string;
};

function readEventSeedText(event: EventCandidate): string {
  return [event.title?.trim(), event.place?.trim()].filter(Boolean).join(" ").trim();
}

function roleToPortalIntent(role: MarketIntentRole): PortalIntentId {
  return role === "seeking" ? "seek" : "offer";
}

function isMarketLikeText(text: string): boolean {
  if (!text.trim()) {
    return false;
  }
  const classified = classifyPinDomainFromText(text);
  return classified.inferredDomainId === "market" || classified.domainId === "market";
}

/** Internal context → Portal market projection suggestion (deterministic). */
export function resolvePortalMarketSuggestionFromEvent(
  event: EventCandidate | null | undefined,
): PortalMarketSuggestion | null {
  if (!event?.id?.trim()) {
    return null;
  }

  const existing = findMarketIntentByEventId(event.id);
  if (existing?.active && isMarketIntentPublishedExternal(existing.detail)) {
    return null;
  }

  if (existing?.active && !isMarketIntentPublishedExternal(existing.detail)) {
    const productName =
      existing.detail.productName.trim() || existing.title.trim() || event.title.trim();
    if (!productName) {
      return null;
    }
    return {
      kind: "publish_external",
      eventId: event.id,
      portalIntentId: roleToPortalIntent(existing.role),
      role: existing.role,
      productName,
      seedText: productName,
    };
  }

  const seedText = readEventSeedText(event);
  if (!seedText || !isMarketLikeText(seedText)) {
    return null;
  }

  const normalized = normalizeMarketIntentFromText({
    text: seedText,
    eventId: event.id,
  });
  if (!normalized) {
    return null;
  }

  const productName = normalized.detail.productName.trim() || normalized.title.trim();
  if (!isValidMarketProductName(productName)) {
    return null;
  }

  return {
    kind: "create_projection",
    eventId: event.id,
    portalIntentId: roleToPortalIntent(normalized.role),
    role: normalized.role,
    productName,
    seedText,
  };
}
