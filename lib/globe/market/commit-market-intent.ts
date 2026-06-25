import type { MarketIntentDraft, MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { DEFAULT_MARKET_INTENT_DETAIL } from "@/lib/globe/market/market-intent-detail";
import {
  saveMarketIntent,
  stampMarketIntentOnEvent,
} from "@/lib/globe/market/market-alignment-store";
import { syncMarketIntentRemote } from "@/lib/globe/market/client/sync-market-intent-remote";
import { syncMarketIntentGlobePin } from "@/lib/globe/market/sync-market-intent-globe-pin";
import { ingestGlobeContextFromFiles } from "@/lib/feed/ingest-globe-context-capture";
import { countMarketListingMedia } from "@/lib/globe/market/market-listing-media";
import {
  uploadMarketListingPhotos,
  uploadMarketListingVideos,
} from "@/lib/globe/market/upload-market-listing-photos";
import { normalizeMarketIntentDraftFromPrioritySlots } from "@/lib/globe/market/patch-market-draft-priority-slot";
import { syncMarketPreferenceOnIntentCommit } from "@/lib/globe/market/preference-memory/sync-market-preference-on-intent-commit";
import { createClient } from "@/lib/supabase/client";

export async function commitMarketIntentFromDraft(
  draft: MarketIntentDraft,
  options?: { photoFiles?: File[]; publishExternal?: boolean },
): Promise<MarketIntentRecord> {
  const publishExternal = options?.publishExternal === true;
  const normalizedDraft = normalizeMarketIntentDraftFromPrioritySlots(draft);
  const mediaCounts = countMarketListingMedia(options?.photoFiles ?? []);
  let detail = {
    ...(normalizedDraft.detail ?? DEFAULT_MARKET_INTENT_DETAIL),
    photoCount: mediaCounts.photoCount || draft.detail?.photoCount || 0,
    videoCount: mediaCounts.videoCount || draft.detail?.videoCount || 0,
    publishedExternal: publishExternal,
  };

  if (options?.photoFiles?.length) {
    try {
      await ingestGlobeContextFromFiles(options.photoFiles, {
        hintEventId: normalizedDraft.eventId,
        hintTitle: normalizedDraft.title.trim() || detail.productName,
        forceAttachToHint: true,
      });
    } catch {
      // media is optional — intent still commits
    }

    if (normalizedDraft.role === "listing") {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) {
          const [photoUrls, videoUrls] = await Promise.all([
            uploadMarketListingPhotos({
              userId: user.id,
              eventId: normalizedDraft.eventId,
              photoFiles: options.photoFiles,
            }),
            uploadMarketListingVideos({
              userId: user.id,
              eventId: normalizedDraft.eventId,
              videoFiles: options.photoFiles,
            }),
          ]);
          if (photoUrls.length > 0 || videoUrls.length > 0) {
            detail = {
              ...detail,
              ...(photoUrls.length > 0 ? { photoUrls, photoCount: photoUrls.length } : {}),
              ...(videoUrls.length > 0 ? { videoUrls, videoCount: videoUrls.length } : {}),
            };
          }
        }
      } catch {
        // remote gallery is best-effort
      }
    }
  }

  const record: MarketIntentRecord = {
    id: `mi-${Date.now().toString(36)}`,
    eventId: normalizedDraft.eventId,
    role: normalizedDraft.role,
    categoryId: normalizedDraft.categoryId,
    title: normalizedDraft.title.trim() || detail.productName,
    priceMinKrw: normalizedDraft.priceMinKrw,
    priceMaxKrw: normalizedDraft.priceMaxKrw,
    radiusKm: normalizedDraft.radiusKm,
    anchorLat: normalizedDraft.anchorLat,
    anchorLng: normalizedDraft.anchorLng,
    placeLabel: normalizedDraft.placeLabel,
    peakHour: normalizedDraft.peakHour,
    confirmedAtIso: new Date().toISOString(),
    active: true,
    detail,
  };

  const anchor = await syncMarketIntentGlobePin(record);
  const anchoredRecord: MarketIntentRecord = {
    ...record,
    anchorLat: anchor.lat,
    anchorLng: anchor.lng,
    placeLabel: anchor.placeLabel,
  };

  saveMarketIntent(anchoredRecord);
  stampMarketIntentOnEvent(anchoredRecord);
  syncMarketPreferenceOnIntentCommit(anchoredRecord);

  if (!publishExternal) {
    return anchoredRecord;
  }

  const remote = await syncMarketIntentRemote(anchoredRecord);
  if (remote) {
    const merged = { ...anchoredRecord, ...remote, id: remote.id, userId: remote.userId };
    saveMarketIntent(merged);
    stampMarketIntentOnEvent(merged);
    await syncMarketIntentGlobePin(merged);
    syncMarketPreferenceOnIntentCommit(merged);
    return merged;
  }

  return anchoredRecord;
}
