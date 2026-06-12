"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  readFeedCaptureFragments,
} from "@/lib/feed/feed-capture-metadata";
import {
  FEED_CAPTURES_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { readMediaBlob } from "@/lib/location-ping/media-blob-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function isRemoteShareUrl(url: string | undefined): boolean {
  const value = url?.trim();
  if (!value) {
    return false;
  }
  return value.startsWith("https://") && !value.startsWith("blob:");
}

async function uploadCaptureBlob(input: {
  eventId: string;
  capture: FeedCaptureFragment;
  blob: Blob;
}): Promise<string> {
  const form = new FormData();
  const ext =
    input.blob.type.includes("png")
      ? "png"
      : input.blob.type.includes("webp")
        ? "webp"
        : "jpg";
  form.append(
    "file",
    new File([input.blob], `${input.capture.id}.${ext}`, {
      type: input.blob.type || "image/jpeg",
    }),
  );
  form.append("eventId", input.eventId);
  form.append("captureId", input.capture.id);

  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/upload-media`;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const body = (await response.json()) as { mediaUrl?: string; error?: string };
  if (!response.ok || !body.mediaUrl?.trim()) {
    throw new Error(body.error?.trim() || "사진 업로드에 실패했어요.");
  }
  return body.mediaUrl.trim();
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

    const mediaId = capture.mediaContextId?.trim();
    if (!mediaId) {
      nextCaptures.push(capture);
      continue;
    }

    const blob = await readMediaBlob(mediaId);
    if (!blob) {
      nextCaptures.push(capture);
      continue;
    }

    try {
      const mediaUrl = await uploadCaptureBlob({
        eventId: event.id,
        capture,
        blob,
      });
      nextCaptures.push({ ...capture, url: mediaUrl });
      changed = true;
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

function mergeCaptureUrls(
  local: FeedCaptureFragment,
  remote: FeedCaptureFragment,
): FeedCaptureFragment {
  if (isRemoteShareUrl(local.url)) {
    return local;
  }
  if (isRemoteShareUrl(remote.url)) {
    return { ...local, url: remote.url };
  }
  return local;
}

/** Invitee — pull https capture urls from server bridge snapshot. */
export async function mergeBridgeRemoteCaptureUrls(input: {
  event: EventCandidate;
  remoteEvent: EventCandidate;
}): Promise<EventCandidate | null> {
  const localCaptures = readFeedCaptureFragments(input.event);
  const remoteCaptures = readFeedCaptureFragments(input.remoteEvent);
  if (remoteCaptures.length === 0) {
    return null;
  }

  const remoteById = new Map(remoteCaptures.map((row) => [row.id, row]));
  let changed = false;
  const merged = localCaptures.map((capture) => {
    const remote = remoteById.get(capture.id);
    if (!remote) {
      return capture;
    }
    const next = mergeCaptureUrls(capture, remote);
    if (next.url !== capture.url) {
      changed = true;
    }
    return next;
  });

  if (!changed) {
    return null;
  }

  return commitEventUpsert({
    id: input.event.id,
    title: input.event.title,
    category: input.event.category,
    source: input.event.source,
    lifecycle: input.event.lifecycle,
    datetime: input.event.datetime,
    place: input.event.place,
    containerId: input.event.containerId,
    confidence: input.event.confidence,
    metadata: {
      ...input.event.metadata,
      [FEED_CAPTURES_META_KEY]: merged,
    },
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt ?? new Date().toISOString(),
  });
}
