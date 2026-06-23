import type { MarketIntentDraft, MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";
import {
  saveMarketIntent,
  stampMarketIntentOnEvent,
} from "@/lib/globe/market/market-alignment-store";
import { syncMarketIntentRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import { syncMarketIntentGlobePin } from "@/lib/globe/market/sync-market-intent-globe-pin";
import { ingestGlobeContextFromFiles } from "@/lib/feed/ingest-globe-context-capture";
import { uploadMarketListingPhotos } from "@/lib/globe/market/upload-market-listing-photos";
import { createClient } from "@/lib/supabase/client";

export async function commitMarketIntentFromDraft(
  draft: MarketIntentDraft,
  options?: { photoFiles?: File[]; publishExternal?: boolean },
): Promise<MarketIntentRecord> {
  const publishExternal = options?.publishExternal === true;
  let detail = {
    ...(draft.detail ?? DEFAULT_MARKET_INTENT_DETAIL),
    photoCount: options?.photoFiles?.length ?? draft.detail?.photoCount ?? 0,
    publishedExternal: publishExternal,
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

    if (draft.role === "listing") {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          const photoUrls = await uploadMarketListingPhotos({
            userId: user.id,
            eventId: draft.eventId,
            photoFiles: options.photoFiles,
          });
          if (photoUrls.length > 0) {
            detail = { ...detail, photoUrls };
          }
        }
      } catch {
        // remote gallery is best-effort
      }
    }
  }

  const anchor = await syncMarketIntentGlobePin(record);
  const anchoredRecord: MarketIntentRecord = {
    ...record,
    anchorLat: anchor.lat,
    anchorLng: anchor.lng,
    placeLabel: anchor.placeLabel,
  };

  saveMarketIntent(anchoredRecord);
  stampMarketIntentOnEvent(anchoredRecord);

  if (!publishExternal) {
    return anchoredRecord;
  }

  const remote = await syncMarketIntentRemote(anchoredRecord);
  if (remote) {
    const merged = { ...anchoredRecord, ...remote, id: remote.id, userId: remote.userId };
    saveMarketIntent(merged);
    stampMarketIntentOnEvent(merged);
    await syncMarketIntentGlobePin(merged);
    return merged;
  }

  return anchoredRecord;
}
