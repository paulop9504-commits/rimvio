import type { MarketIntentDraft, MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";
import {
  saveMarketIntent,
  stampMarketIntentOnEvent,
} from "@/lib/globe/market/market-alignment-store";
import { syncMarketIntentRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import { ingestGlobeContextFromFiles } from "@/lib/feed/ingest-globe-context-capture";

export async function commitMarketIntentFromDraft(
  draft: MarketIntentDraft,
  options?: { photoFiles?: File[] },
): Promise<MarketIntentRecord> {
  const detail = {
    ...(draft.detail ?? DEFAULT_MARKET_INTENT_DETAIL),
    photoCount: options?.photoFiles?.length ?? draft.detail?.photoCount ?? 0,
  };
  const record: MarketIntentRecord = {
    id: `mi-${Date.now().toString(36)}`,
    eventId: draft.eventId,
    role: draft.role,
    categoryId: draft.categoryId,
    title: draft.title.trim() || detail.productName,
    priceMinKrw: draft.priceMinKrw,
    priceMaxKrw: draft.priceMaxKrw,
    radiusKm: draft.radiusKm,
    anchorLat: draft.anchorLat,
    anchorLng: draft.anchorLng,
    placeLabel: draft.placeLabel,
    peakHour: draft.peakHour,
    confirmedAtIso: new Date().toISOString(),
    active: true,
    detail,
  };
  saveMarketIntent(record);
  stampMarketIntentOnEvent(record);

  if (options?.photoFiles?.length) {
    try {
      await ingestGlobeContextFromFiles(options.photoFiles, {
        hintEventId: draft.eventId,
        hintTitle: record.title,
        forceAttachToHint: true,
      });
    } catch {
      // photos are optional — intent still commits
    }
  }

  const remote = await syncMarketIntentRemote(record);
  if (remote) {
    const merged = { ...record, ...remote, id: remote.id, userId: remote.userId };
    saveMarketIntent(merged);
    stampMarketIntentOnEvent(merged);
    return merged;
  }

  return record;
}
