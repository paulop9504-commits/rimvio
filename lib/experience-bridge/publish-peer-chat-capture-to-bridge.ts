"use client";

import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import { listEventCandidates } from "@/lib/events/event-store";
import { ensureBridgeLinkBeforePublish } from "@/lib/experience-bridge/ensure-bridge-link-before-publish";
import { publishBridgeCaptureContribution } from "@/lib/experience-bridge/publish-bridge-capture-contribution";
import { findPlanEventForPeerThreadAt } from "@/lib/plan-context/find-plan-event-for-peer-thread";

function captureKindFromContext(
  mediaKind: MediaSpacetimeContext["mediaKind"],
): FeedCaptureFragment["kind"] {
  return mediaKind === "video" ? "video" : "photo";
}

function resolveBridgeEventId(input: {
  peerThreadId: string;
  capturedAtIso: string;
  eventId?: string | null;
}): string | null {
  const explicit = input.eventId?.trim();
  if (explicit) {
    return explicit;
  }
  const threadId = input.peerThreadId.trim();
  if (!threadId) {
    return null;
  }
  const event = findPlanEventForPeerThreadAt(listEventCandidates(), {
    peerThreadId: threadId,
    capturedAtIso: input.capturedAtIso,
  });
  return event?.id.trim() || null;
}

/** After peer ROOM image send — publish to linked bridge for other members. */
export async function publishPeerChatCaptureToBridgeIfLinked(input: {
  peerThreadId: string;
  context: MediaSpacetimeContext;
  eventId?: string | null;
}): Promise<void> {
  const eventId = resolveBridgeEventId({
    peerThreadId: input.peerThreadId,
    capturedAtIso: input.context.capturedAtIso,
    eventId: input.eventId,
  });
  if (!eventId) {
    return;
  }

  if (!(await ensureBridgeLinkBeforePublish(eventId))) {
    return;
  }

  const fragment: FeedCaptureFragment = {
    id: input.context.id,
    kind: captureKindFromContext(input.context.mediaKind),
    capturedAtIso: input.context.capturedAtIso,
    mediaContextId: input.context.id,
    placeLabel: input.context.placeLabel ?? undefined,
  };

  await publishBridgeCaptureContribution({ eventId, fragment });
}
