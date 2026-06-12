import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import { projectVolumeSpatialMedia } from "@/lib/experience-graph/project-volume-spatial-media";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { parseUploadMediaContextId } from "@/lib/location-ping/media-blob-store";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";

export type ContextMediaReelItem = {
  id: string;
  label: string;
  imageUrl: string | null;
  mediaContextId: string | null;
  capturedAtIso: string | null;
  kind: "photo" | "video";
};

function parseCapturedMs(iso: string | null | undefined): number {
  if (!iso?.trim()) {
    return 0;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function appendFromMediaStore(
  eventId: string,
  push: (item: ContextMediaReelItem) => void,
): void {
  const key = eventId.trim();
  if (!key) {
    return;
  }

  for (const row of readMediaContextMemorySnapshot()) {
    if (row.originRef?.trim() !== key) {
      continue;
    }
    if (row.mediaKind !== "photo" && row.mediaKind !== "video") {
      continue;
    }
    push({
      id: `store:${row.id}`,
      label:
        row.placeLabel?.trim() ||
        (row.mediaKind === "video" ? "동영상" : "사진"),
      imageUrl: null,
      mediaContextId: row.id.trim(),
      capturedAtIso: row.capturedAtIso,
      kind: row.mediaKind,
    });
  }
}

/** All photo/video for a context — newest first, no stock placeholders. */
export function projectContextMediaReel(input: {
  event: EventCandidate | null | undefined;
  volume: ExperienceVolume | null | undefined;
  limit?: number;
}): ContextMediaReelItem[] {
  const limit = input.limit ?? 48;
  const items: ContextMediaReelItem[] = [];
  const seen = new Set<string>();

  const push = (item: ContextMediaReelItem) => {
    const remoteUrl = item.imageUrl?.trim() || "";
    const key =
      remoteUrl ||
      item.mediaContextId?.trim() ||
      item.id;
    if (!key || seen.has(key) || items.length >= limit) {
      return;
    }
    if (!remoteUrl && !item.mediaContextId?.trim()) {
      return;
    }
    seen.add(key);
    items.push(item);
  };

  for (const row of readFeedCaptureFragments(input.event)) {
    if (row.kind !== "photo" && row.kind !== "video") {
      continue;
    }
    push({
      id: `capture:${row.id}`,
      label:
        row.label?.trim() ||
        row.placeLabel?.trim() ||
        (row.kind === "video" ? "동영상" : "사진"),
      imageUrl: row.url?.trim() || null,
      mediaContextId: row.mediaContextId?.trim() || null,
      capturedAtIso: row.capturedAtIso,
      kind: row.kind,
    });
  }

  if (input.event?.id) {
    appendFromMediaStore(input.event.id, push);
  }

  if (input.volume) {
    for (const row of projectVolumeSpatialMedia(input.volume)) {
      if (row.kind !== "photo" && row.kind !== "video") {
        continue;
      }
      const mediaContextId = parseUploadMediaContextId(row.id);
      if (!mediaContextId) {
        continue;
      }
      push({
        id: `spatial:${row.id}`,
        label: row.title?.trim() || row.caption?.trim() || "기록",
        imageUrl: null,
        mediaContextId,
        capturedAtIso: row.capturedAtIso,
        kind: row.kind,
      });
    }
  }

  return items.sort(
    (left, right) =>
      parseCapturedMs(right.capturedAtIso) - parseCapturedMs(left.capturedAtIso),
  );
}
