import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { MarketPhotoMemoryPlace } from "@/lib/globe/market/extract-market-photo-memory-place";
import { syncMarketMemoryRecordOnDraft } from "@/lib/globe/market/memory/sync-market-memory-record";

/** Photo EXIF place → memory story/tags (trade place is separate). */
export function enrichMarketMemoryFromPhotoPlace(
  draft: MarketIntentDraft,
  photoMemory: MarketPhotoMemoryPlace | null,
): MarketIntentDraft {
  if (!photoMemory || draft.role !== "listing") {
    return draft;
  }

  const memoryPatch =
    draft.detail.memoryRecord.story.trim().length > 0
      ? {}
      : { story: `${photoMemory.placeLabel}에서 함께한 시간` };

  return syncMarketMemoryRecordOnDraft(
    {
      ...draft,
      detail: {
        ...draft.detail,
        memoryPlaceLabel: photoMemory.placeLabel,
        memoryPlaceLat: photoMemory.lat,
        memoryPlaceLng: photoMemory.lng,
      },
    },
    memoryPatch,
  );
}
