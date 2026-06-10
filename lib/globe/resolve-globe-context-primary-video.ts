import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";

export type GlobeContextPrimaryVideo = {
  mediaContextId: string;
  label: string;
  capturedAtIso: string;
};

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
  if (!latest?.mediaContextId?.trim()) {
    return null;
  }

  return {
    mediaContextId: latest.mediaContextId.trim(),
    label: latest.label?.trim() || latest.placeLabel?.trim() || "동영상",
    capturedAtIso: latest.capturedAtIso,
  };
}
