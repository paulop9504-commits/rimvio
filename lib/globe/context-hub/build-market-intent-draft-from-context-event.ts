import type { EventCandidate } from "@/lib/events/event-candidate";
import { findMarketIntentByEventId } from "@/lib/globe/market/market-alignment-store";
import { createMarketIntentDraftFromRole } from "@/lib/globe/market/create-market-intent-draft-from-role";
import { normalizeMarketIntentFromText } from "@/lib/globe/market/normalize-market-intent-from-text";
import type {
  MarketIntentDraft,
  MarketIntentRecord,
  MarketIntentRole,
} from "@/lib/globe/market/market-intent-types";

function recordToDraft(record: MarketIntentRecord): MarketIntentDraft {
  return {
    eventId: record.eventId,
    role: record.role,
    categoryId: record.categoryId,
    title: record.title,
    priceMinKrw: record.priceMinKrw,
    priceMaxKrw: record.priceMaxKrw,
    radiusKm: record.radiusKm,
    anchorLat: record.anchorLat,
    anchorLng: record.anchorLng,
    placeLabel: record.placeLabel,
    peakHour: record.peakHour,
    prefillSources: ["saved_intent", "context_hub"],
    detail: { ...record.detail },
  };
}

function contextSeedText(event: EventCandidate): string {
  return [event.title?.trim(), event.place?.trim()].filter(Boolean).join(" ");
}

/** Existing context pin → market Portal draft (no new EventCandidate). */
export function buildMarketIntentDraftFromContextEvent(
  event: EventCandidate,
  options?: { role?: MarketIntentRole },
): MarketIntentDraft {
  const existing = findMarketIntentByEventId(event.id);
  if (existing?.active) {
    return recordToDraft(existing);
  }

  const seed = contextSeedText(event);
  const normalized = seed
    ? normalizeMarketIntentFromText({ text: seed, eventId: event.id })
    : null;
  if (normalized) {
    return {
      ...normalized,
      role: options?.role ?? normalized.role,
      prefillSources: [...normalized.prefillSources, "context_hub"],
    };
  }

  return {
    ...createMarketIntentDraftFromRole({
      role: options?.role ?? "listing",
      eventId: event.id,
    }),
    prefillSources: ["context_hub", "trade_dock"],
  };
}
