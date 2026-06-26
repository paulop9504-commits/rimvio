import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";
import { upsertEventCandidate } from "@/lib/events/event-store";
import { findEventCandidate } from "@/lib/events/event-store";
import { BRIDGE_TYPE_META_KEY } from "@/lib/bridge/bridge-type";
import { MARKET_INTENT_META_KEY } from "@/lib/globe/market/market-intent-types";

const STORAGE_KEY = "rimvio-market-intents.v1";
export const MARKET_INTENTS_UPDATED = "rimvio-market-intents-updated";

function readAll(): MarketIntentRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as MarketIntentRecord[];
    return Array.isArray(parsed) ? parsed.filter((row) => row?.id && row.eventId) : [];
  } catch {
    return [];
  }
}

function writeAll(rows: MarketIntentRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(MARKET_INTENTS_UPDATED));
}

function emitUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MARKET_INTENTS_UPDATED));
  }
}

export function listActiveMarketIntents(): MarketIntentRecord[] {
  return readAll().filter((row) => row.active);
}

export function listAllMarketIntents(): MarketIntentRecord[] {
  return readAll();
}

/** Merge remote SSOT with local rows — never resurrect locally ended intents. */
export function mergeOwnMarketIntents(
  localAll: readonly MarketIntentRecord[],
  remote: readonly MarketIntentRecord[],
): MarketIntentRecord[] {
  const deactivatedEventIds = new Set(
    localAll.filter((row) => !row.active).map((row) => row.eventId),
  );
  const merged = new Map<string, MarketIntentRecord>();

  for (const row of localAll) {
    if (row.active) {
      merged.set(row.eventId, row);
    }
  }

  for (const row of remote) {
    if (!row.active || deactivatedEventIds.has(row.eventId)) {
      continue;
    }
    if (!merged.has(row.eventId)) {
      merged.set(row.eventId, row);
    }
  }

  return [...merged.values()];
}

export function findMarketIntentByEventId(
  eventId: string,
): MarketIntentRecord | null {
  const key = eventId.trim();
  return readAll().find((row) => row.eventId === key && row.active) ?? null;
}

export function saveMarketIntent(record: MarketIntentRecord): MarketIntentRecord {
  const rows = readAll().filter((row) => row.eventId !== record.eventId);
  rows.unshift(record);
  writeAll(rows);
  return record;
}

export function deactivateMarketIntent(eventId: string): void {
  const rows = readAll().map((row) =>
    row.eventId === eventId.trim() ? { ...row, active: false } : row,
  );
  writeAll(rows);
}

export function stampMarketIntentOnEvent(record: MarketIntentRecord): void {
  const event = findEventCandidate(record.eventId);
  if (!event) {
    return;
  }
  upsertEventCandidate({
    ...event,
    metadata: {
      ...event.metadata,
      [BRIDGE_TYPE_META_KEY]: "marketplace",
      [MARKET_INTENT_META_KEY]: {
        id: record.id,
        role: record.role,
        categoryId: record.categoryId,
        priceMinKrw: record.priceMinKrw,
        priceMaxKrw: record.priceMaxKrw,
        radiusKm: record.radiusKm,
        anchorLat: record.anchorLat,
        anchorLng: record.anchorLng,
        placeLabel: record.placeLabel,
        peakHour: record.peakHour,
        confirmedAtIso: record.confirmedAtIso,
        detail: record.detail ?? DEFAULT_MARKET_INTENT_DETAIL,
      },
    },
  });
}

export function subscribeMarketIntents(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => onChange();
  window.addEventListener(MARKET_INTENTS_UPDATED, handler);
  return () => window.removeEventListener(MARKET_INTENTS_UPDATED, handler);
}

export function resetMarketIntentsForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  emitUpdated();
}
