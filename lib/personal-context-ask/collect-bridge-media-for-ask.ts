import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import type { PersonalContextPhotoPreview } from "@/lib/personal-context-ask/personal-context-ask-types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

const PHOTO_COUNT_CAP = 200;
export const ASK_PHOTO_PREVIEW_CAP = 6;
const PREVIEW_CAP = ASK_PHOTO_PREVIEW_CAP;

function toPreview(
  row: ReturnType<typeof projectContextMediaReel>[number],
): PersonalContextPhotoPreview {
  return {
    id: row.id,
    imageUrl: row.imageUrl,
    mediaContextId: row.mediaContextId,
    allowLocalBlob: row.allowLocalBlob === true,
    capturedAtIso: row.capturedAtIso,
    kind: row.kind,
  };
}

function readDwellDays(event: EventCandidate): number | null {
  const plan = readPlanContextFromEvent(event);
  const startIso = event.datetime?.trim() || event.createdAt?.trim();
  const endIso = plan?.windowEndIso?.trim();
  if (!startIso || !endIso) {
    return null;
  }
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return null;
  }
  const days = Math.ceil((endMs - startMs) / 86_400_000);
  return days > 0 ? days : null;
}

function countBridgePhotos(event: EventCandidate): number {
  const reel = projectContextMediaReel({
    event,
    volume: null,
    limit: PHOTO_COUNT_CAP,
  });
  const reelPhotoIds = new Set(
    reel.filter((row) => row.kind === "photo").map((row) => row.id),
  );
  if (reelPhotoIds.size > 0) {
    return reelPhotoIds.size;
  }
  return readFeedCaptureFragments(event).filter((row) => row.kind === "photo").length;
}

/** Pure read — photo previews + counts for one bridge event. */
export function collectBridgeMediaForAsk(input: {
  event: EventCandidate;
  previewLimit?: number;
}): {
  photoCount: number;
  dwellDays: number | null;
  photoPreviews: PersonalContextPhotoPreview[];
} {
  const previewLimit = input.previewLimit ?? PREVIEW_CAP;
  const reel = projectContextMediaReel({
    event: input.event,
    volume: null,
    limit: PHOTO_COUNT_CAP,
  });
  const photos = reel.filter((row) => row.kind === "photo");
  const photoPreviews = photos.slice(0, previewLimit).map(toPreview);

  return {
    photoCount: photos.length > 0 ? photos.length : countBridgePhotos(input.event),
    dwellDays: readDwellDays(input.event),
    photoPreviews,
  };
}
