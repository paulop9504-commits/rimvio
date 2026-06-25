import type { EventCandidate } from "@/lib/events/event-candidate";
import { projectContextMediaReel } from "@/lib/globe/project-context-media-reel";
import type {
  GlobeContextTrigger,
  GlobeContextTriggerMediaPreview,
} from "@/lib/globe/context-triggers/globe-context-trigger-types";

export type ContextMediaRichness = {
  videoCount: number;
  photoUrlCount: number;
  photoLocalCount: number;
  renderableCount: number;
  score: number;
};

function hasRenderablePreview(row: {
  imageUrl: string | null;
  allowLocalBlob?: boolean;
  mediaContextId: string | null;
}): boolean {
  if (row.imageUrl?.trim()) {
    return true;
  }
  return row.allowLocalBlob === true && Boolean(row.mediaContextId?.trim());
}

function scorePreview(row: GlobeContextTriggerMediaPreview): number {
  if (!hasRenderablePreview(row)) {
    return 0;
  }
  if (row.kind === "video") {
    return 120;
  }
  if (row.imageUrl?.trim()) {
    return 24;
  }
  return 10;
}

/** Rank event captures — video > remote photo > local blob photo. */
export function scoreEventMediaRichness(
  event: EventCandidate | null | undefined,
): ContextMediaRichness {
  if (!event) {
    return {
      videoCount: 0,
      photoUrlCount: 0,
      photoLocalCount: 0,
      renderableCount: 0,
      score: 0,
    };
  }

  const reel = projectContextMediaReel({
    event,
    volume: null,
    limit: 24,
  });

  let videoCount = 0;
  let photoUrlCount = 0;
  let photoLocalCount = 0;

  for (const row of reel) {
    if (!hasRenderablePreview(row)) {
      continue;
    }
    if (row.kind === "video") {
      videoCount += 1;
      continue;
    }
    if (row.imageUrl?.trim()) {
      photoUrlCount += 1;
      continue;
    }
    photoLocalCount += 1;
  }

  const renderableCount = videoCount + photoUrlCount + photoLocalCount;
  const score =
    videoCount * 120 + photoUrlCount * 24 + photoLocalCount * 10 + renderableCount;

  return {
    videoCount,
    photoUrlCount,
    photoLocalCount,
    renderableCount,
    score,
  };
}

export function scoreTriggerMediaRichness(trigger: GlobeContextTrigger): number {
  const previews = trigger.mediaPreviews ?? [];
  if (previews.length === 0) {
    return 0;
  }
  let score = 0;
  for (const preview of previews) {
    score += scorePreview(preview);
  }
  return score;
}

export function compareTriggerMediaRichness(
  left: GlobeContextTrigger,
  right: GlobeContextTrigger,
): number {
  return scoreTriggerMediaRichness(right) - scoreTriggerMediaRichness(left);
}

export function promoteMediaRichTriggers(
  picked: readonly GlobeContextTrigger[],
  pool: readonly GlobeContextTrigger[],
  limit: number,
): GlobeContextTrigger[] {
  const usedTriggerIds = new Set(picked.map((row) => row.id));
  let result = [...picked].sort(compareTriggerMediaRichness);

  const mediaBackups = pool
    .filter(
      (row) =>
        scoreTriggerMediaRichness(row) > 0 &&
        !usedTriggerIds.has(row.id) &&
        !result.some((pickedRow) => pickedRow.eventId && pickedRow.eventId === row.eventId),
    )
    .sort(compareTriggerMediaRichness);

  for (const backup of mediaBackups) {
    const weakIndex = result.findIndex((row) => scoreTriggerMediaRichness(row) <= 0);
    if (weakIndex === -1) {
      if (result.length < limit) {
        result.push(backup);
        usedTriggerIds.add(backup.id);
      }
      continue;
    }
    const evicted = result[weakIndex]!;
    result[weakIndex] = backup;
    usedTriggerIds.delete(evicted.id);
    usedTriggerIds.add(backup.id);
  }

  return result.slice(0, limit).sort(compareTriggerMediaRichness);
}
