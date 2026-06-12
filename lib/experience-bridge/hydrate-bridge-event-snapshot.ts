"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import {
  FEED_CAPTURES_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { uploadBridgeCaptureBlob } from "@/lib/experience-bridge/upload-bridge-capture-blob";

function isRemoteShareUrl(url: string | undefined): boolean {
  const value = url?.trim();
  if (!value) {
    return false;
  }
  return value.startsWith("https://") && !value.startsWith("blob:");
}

/** Host share prep — upload local blobs so invitees can load photos. */
export async function hydrateBridgeEventSnapshotForShare(
  event: EventCandidate,
): Promise<EventCandidate> {
  const captures = readFeedCaptureFragments(event);
  if (captures.length === 0) {
    return event;
  }

  let changed = false;
  const nextCaptures: FeedCaptureFragment[] = [];

  for (const capture of captures) {
    if (capture.kind !== "photo") {
      nextCaptures.push(capture);
      continue;
    }
    if (isRemoteShareUrl(capture.url)) {
      nextCaptures.push(capture);
      continue;
    }

    try {
      const mediaUrl = await uploadBridgeCaptureBlob({
        eventId: event.id,
        capture,
      });
      if (mediaUrl) {
        nextCaptures.push({ ...capture, url: mediaUrl });
        changed = true;
      } else {
        nextCaptures.push(capture);
      }
    } catch {
      nextCaptures.push(capture);
    }
  }

  if (!changed) {
    return event;
  }

  return commitEventUpsert({
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
}
