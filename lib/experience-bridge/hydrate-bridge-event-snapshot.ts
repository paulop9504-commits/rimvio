"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import {
  FEED_CAPTURES_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { uploadBridgeCaptureBlob } from "@/lib/experience-bridge/upload-bridge-capture-blob";
import { isUsableBridgeMediaUrl } from "@/lib/experience-bridge/bridge-media-url";

export type HydrateBridgeEventSnapshotResult = {
  event: EventCandidate;
  uploadWarnings: string[];
};

function isShareableBridgeCapture(capture: FeedCaptureFragment): boolean {
  return capture.kind === "photo" || capture.kind === "video";
}

function mediaLabel(capture: FeedCaptureFragment): string {
  return capture.kind === "video" ? "동영상" : "사진";
}

/** Host share prep — upload local blobs so invitees can load photos + videos. */
export async function hydrateBridgeEventSnapshotForShare(
  event: EventCandidate,
): Promise<HydrateBridgeEventSnapshotResult> {
  const captures = readFeedCaptureFragments(event);
  if (captures.length === 0) {
    return { event, uploadWarnings: [] };
  }

  let changed = false;
  const nextCaptures: FeedCaptureFragment[] = [];
  const uploadWarnings: string[] = [];

  for (const capture of captures) {
    if (!isShareableBridgeCapture(capture)) {
      nextCaptures.push(capture);
      continue;
    }
    if (isUsableBridgeMediaUrl(capture.url)) {
      nextCaptures.push(capture);
      continue;
    }

    try {
      const upload = await uploadBridgeCaptureBlob({
        eventId: event.id,
        capture,
      });
      if (!upload?.url) {
        uploadWarnings.push(`${mediaLabel(capture)} 업로드에 실패했어요.`);
        nextCaptures.push(capture);
        continue;
      }
      nextCaptures.push({ ...capture, url: upload.url });
      changed = true;
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : `${mediaLabel(capture)} 업로드에 실패했어요.`;
      uploadWarnings.push(message);
      nextCaptures.push(capture);
    }
  }

  if (!changed) {
    return { event, uploadWarnings };
  }

  const nextEvent = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: {
      ...event.metadata,
      [FEED_CAPTURES_META_KEY]: nextCaptures,
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt ?? new Date().toISOString(),
  });

  return { event: nextEvent, uploadWarnings };
}
