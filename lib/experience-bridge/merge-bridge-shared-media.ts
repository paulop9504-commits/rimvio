"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import {
  FEED_CAPTURES_META_KEY,
  type FeedCaptureFragment,
} from "@/lib/feed/feed-capture-types";
import type { ExperienceBridgeContribution } from "@/lib/experience-bridge/experience-bridge-types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

function isRemoteShareUrl(url: string | undefined): boolean {
  const value = url?.trim();
  return Boolean(value?.startsWith("https://") && !value.startsWith("blob:"));
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
export function mergeBridgeRemoteCaptureUrls(input: {
  event: EventCandidate;
  remoteEvent: EventCandidate;
}): EventCandidate | null {
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

/** Merge other members' bridge contributions into local event for pin reel. */
export function mergeBridgeContributionsIntoEvent(input: {
  event: EventCandidate;
  contributions: readonly ExperienceBridgeContribution[];
  viewerUserId?: string | null;
}): EventCandidate | null {
  if (input.contributions.length === 0) {
    return null;
  }

  const localCaptures = readFeedCaptureFragments(input.event);
  const localIds = new Set(localCaptures.map((row) => row.id));
  const viewerId = input.viewerUserId?.trim() || null;

  const extras: FeedCaptureFragment[] = [];
  for (const row of input.contributions) {
    const capture = row.capture;
    if (!capture?.id?.trim() || localIds.has(capture.id)) {
      continue;
    }
    if (viewerId && row.contributorUserId === viewerId) {
      continue;
    }
    if (capture.kind !== "photo" && capture.kind !== "video") {
      continue;
    }
    if (!isRemoteShareUrl(capture.url) && !capture.mediaContextId?.trim()) {
      continue;
    }
    extras.push({
      id: capture.id,
      kind: capture.kind,
      capturedAtIso: capture.capturedAtIso,
      mediaContextId: capture.mediaContextId,
      placeLabel: capture.placeLabel,
      label: capture.label,
      url: capture.url,
    });
    localIds.add(capture.id);
  }

  if (extras.length === 0) {
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
      [FEED_CAPTURES_META_KEY]: [...localCaptures, ...extras],
    },
    lifecycleUpdatedAt: input.event.lifecycleUpdatedAt ?? new Date().toISOString(),
  });
}
