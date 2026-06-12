"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import { resolveAppOrigin } from "@/lib/auth/redirect-url";
import { EXPERIENCE_BRIDGE_META_KEYS } from "@/lib/experience-bridge/constants";
import { readLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { uploadBridgeCaptureBlob } from "@/lib/experience-bridge/upload-bridge-capture-blob";
import { findLifeEventCandidate } from "@/lib/life-read-model";

function isBridgeLinkedEvent(eventId: string): boolean {
  const key = eventId.trim();
  if (!key) {
    return false;
  }
  if (readLocalBridgeState(key)) {
    return true;
  }
  const event = findLifeEventCandidate(key);
  if (!event) {
    return false;
  }
  if (event.metadata?.experienceBridgeParticipant === true) {
    return true;
  }
  if (typeof event.metadata?.[EXPERIENCE_BRIDGE_META_KEYS.bridgeId] === "string") {
    return true;
  }
  const participants = event.metadata?.experienceBridgeParticipants;
  return Array.isArray(participants) && participants.length > 0;
}

async function postBridgeContribution(input: {
  eventId: string;
  capture: FeedCaptureFragment & {
    ownerUserId?: string;
    authorDisplayName?: string;
  };
}): Promise<void> {
  const endpoint = `${resolveAppOrigin()}/api/experience-bridge/${encodeURIComponent(input.eventId)}/contributions`;
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ capture: input.capture }),
  });
  const body = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error?.trim() || "공유 사진을 저장하지 못했어요.");
  }
}

/** After local ingest — publish photo/video to shared bridge for other members. */
export async function publishBridgeCaptureContribution(input: {
  eventId: string;
  fragment: FeedCaptureFragment;
  authorDisplayName?: string;
}): Promise<void> {
  const eventId = input.eventId.trim();
  if (!eventId || !isBridgeLinkedEvent(eventId)) {
    return;
  }
  if (input.fragment.kind !== "photo" && input.fragment.kind !== "video") {
    return;
  }

  let capture: FeedCaptureFragment & {
    ownerUserId?: string;
    authorDisplayName?: string;
  } = {
    ...input.fragment,
    authorDisplayName: input.authorDisplayName?.trim() || undefined,
  };

  if (capture.kind === "photo") {
    const mediaUrl = await uploadBridgeCaptureBlob({
      eventId,
      capture: input.fragment,
    });
    if (mediaUrl) {
      capture = { ...capture, url: mediaUrl };
    }
  }

  await postBridgeContribution({ eventId, capture });
}

/** Publish all new photo captures on a bridge event (batch after bulk ingest). */
export async function publishBridgeEventCaptureContributions(input: {
  event: EventCandidate;
  authorDisplayName?: string;
  onlyCaptureIds?: readonly string[];
}): Promise<void> {
  const eventId = input.event.id.trim();
  if (!eventId || !isBridgeLinkedEvent(eventId)) {
    return;
  }

  const allow = input.onlyCaptureIds
    ? new Set(input.onlyCaptureIds.map((id) => id.trim()))
    : null;

  for (const fragment of readFeedCaptureFragments(input.event)) {
    if (allow && !allow.has(fragment.id)) {
      continue;
    }
    if (fragment.kind !== "photo" && fragment.kind !== "video") {
      continue;
    }
    await publishBridgeCaptureContribution({
      eventId,
      fragment,
      authorDisplayName: input.authorDisplayName,
    });
  }
}
