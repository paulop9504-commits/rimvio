import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { readMediaContextMemorySnapshot } from "@/lib/location-ping/media-context-store";

export type GlobeContextPrimaryVideo = {
  mediaContextId: string;
  label: string;
  capturedAtIso: string;
};

function resolveFromMediaStore(eventId: string): GlobeContextPrimaryVideo | null {
  const key = eventId.trim();
  if (!key) {
    return null;
  }

  const videos = readMediaContextMemorySnapshot()
    .filter((row) => row.mediaKind === "video")
    .filter((row) => {
      const ref = row.originRef?.trim();
      return ref === key;
    })
    .sort(
      (left, right) =>
        Date.parse(right.capturedAtIso) - Date.parse(left.capturedAtIso),
    );

  const latest = videos[0];
  if (!latest?.id.trim()) {
    return null;
  }

  return {
    mediaContextId: latest.id.trim(),
    label: latest.placeLabel?.trim() || "동영상",
    capturedAtIso: latest.capturedAtIso,
  };
}

/** Latest uploaded video attached to a globe context — map replay spine. */
export function resolveGlobeContextPrimaryVideo(
  event: EventCandidate | null | undefined,
): GlobeContextPrimaryVideo | null {
  if (!event) {
    return null;
  }

  const videos = readFeedCaptureFragments(event)
    .filter((row) => row.kind === "video" && row.mediaContextId?.trim())
    .sort(
      (left, right) =>
        Date.parse(right.capturedAtIso) - Date.parse(left.capturedAtIso),
    );

  const latest = videos[0];
  if (latest?.mediaContextId?.trim()) {
    return {
      mediaContextId: latest.mediaContextId.trim(),
      label: latest.label?.trim() || latest.placeLabel?.trim() || "동영상",
      capturedAtIso: latest.capturedAtIso,
    };
  }

  return resolveFromMediaStore(event.id);
}

export function globeContextHasVideo(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event) {
    return false;
  }
  if (resolveGlobeContextPrimaryVideo(event)) {
    return true;
  }
  return readFeedCaptureFragments(event).some((row) => row.kind === "video");
}
