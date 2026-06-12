import type { ExperienceVolume } from "@/lib/experience-graph/experience-volume-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";

export type ContextMediaReelItem = {
  id: string;
  label: string;
  imageUrl: string | null;
  mediaContextId: string | null;
  capturedAtIso: string | null;
  kind: "photo" | "video";
  /** When false, never load IndexedDB blob — shared/remote captures need https url. */
  allowLocalBlob?: boolean;
};

function parseCapturedMs(iso: string | null | undefined): number {
  if (!iso?.trim()) {
    return 0;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function isBridgeSharedEvent(event: EventCandidate | null | undefined): boolean {
  if (!event?.metadata) {
    return false;
  }
  const meta = event.metadata;
  return (
    meta.experienceBridgeParticipant === true ||
    meta.experienceBridgeHost === true ||
    typeof meta[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string"
  );
}

function isLocalEventMedia(
  eventId: string,
  mediaContextId: string | null | undefined,
): boolean {
  const key = eventId.trim();
  const mediaId = mediaContextId?.trim();
  if (!key || !mediaId) {
    return false;
  }
  return readMediaContextMemorySnapshot().some(
    (row) => row.id.trim() === mediaId && row.originRef?.trim() === key,
  );
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
      allowLocalBlob: true,
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
  const eventId = input.event?.id?.trim() ?? "";
  const bridgeShared = isBridgeSharedEvent(input.event);
  const items: ContextMediaReelItem[] = [];
  const seen = new Set<string>();

  const push = (item: ContextMediaReelItem) => {
    const remoteUrl = item.imageUrl?.trim() || "";
    const key =
      remoteUrl ||
      (item.allowLocalBlob ? item.mediaContextId?.trim() : "") ||
      item.id;
    if (!key || seen.has(key) || items.length >= limit) {
      return;
    }
    if (!remoteUrl && !item.allowLocalBlob) {
      return;
    }
    if (!remoteUrl && item.allowLocalBlob && !item.mediaContextId?.trim()) {
      return;
    }
    seen.add(key);
    items.push(item);
  };

  for (const row of readFeedCaptureFragments(input.event)) {
    if (row.kind !== "photo" && row.kind !== "video") {
      continue;
    }
    const mediaContextId = row.mediaContextId?.trim() || null;
    const imageUrl = isUsableBridgeMediaUrl(row.url) ? row.url!.trim() : null;
    const allowLocalBlob = bridgeShared
      ? isLocalEventMedia(eventId, mediaContextId)
      : Boolean(mediaContextId);

    push({
      id: `capture:${row.id}`,
      label:
        row.label?.trim() ||
        row.placeLabel?.trim() ||
        (row.kind === "video" ? "동영상" : "사진"),
      imageUrl,
      mediaContextId,
      capturedAtIso: row.capturedAtIso,
      kind: row.kind,
      allowLocalBlob,
    });
  }

  if (eventId) {
    appendFromMediaStore(eventId, push);
  }

  // Do not project volume spatial media into the pin reel — spacetime matching
  // leaks unrelated local uploads (e.g. Jeju video) into bridge/shared contexts.

  return items.sort(
    (left, right) =>
      parseCapturedMs(right.capturedAtIso) - parseCapturedMs(left.capturedAtIso),
  );
}
