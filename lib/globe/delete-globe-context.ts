import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  clearFeedCaptureMetadata,
  readFeedCaptureFragments,
} from "@/lib/feed/feed-capture-metadata";
import {
  readMirrorProvenance,
  upsertMirrorProvenanceMetadata,
} from "@/lib/globe/mirror-provenance";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { removePersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import {
  clearMediaSpacetimeOriginRef,
  listMediaSpacetimeContexts,
} from "@/lib/location-ping/media-context-store";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const GLOBE_CONTEXT_REMOVED_META = "globeContextRemoved";
export type GlobeContextDeleteIntent =
  | "detach_local"
  | "delete_upstream"
  | "blocked";

export type DeleteGlobeContextResult = {
  eventId: string;
  action: GlobeContextDeleteIntent;
  removedPin: boolean;
  hidden: boolean;
  skipped: boolean;
  reason?: string;
};

export function isGlobeContextRemoved(event: EventCandidate | null | undefined): boolean {
  return event?.metadata?.[GLOBE_CONTEXT_REMOVED_META] === true;
}

export function resolveGlobeContextDeleteIntent(
  event: EventCandidate | null | undefined,
): GlobeContextDeleteIntent {
  const deleteMode = readMirrorProvenance(event?.metadata)?.permissions.deleteMode;
  if (deleteMode === "local_only") {
    return "detach_local";
  }
  if (deleteMode === "blocked") {
    return "blocked";
  }
  return "delete_upstream";
}

function buildRemovedMetadata(
  event: EventCandidate,
  action: Exclude<GlobeContextDeleteIntent, "blocked">,
): Record<string, unknown> {
  const nowIso = new Date().toISOString();
  let next =
    action === "delete_upstream"
      ? clearFeedCaptureMetadata(event.metadata)
      : { ...(event.metadata ?? {}) };
  const provenance = readMirrorProvenance(event.metadata);
  if (provenance) {
    next = upsertMirrorProvenanceMetadata({
      metadata: next,
      patch: {
        sync: {
          state: action === "detach_local" ? "detached" : "source_deleted",
        },
      },
      audit: {
        action,
        subject: {
          eventId: event.id,
          nodeId: provenance.origin.originNodeId ?? event.id,
        },
        refs: provenance.bridge,
        diff: [
          action === "detach_local"
            ? "state:detached"
            : "state:source_deleted",
        ],
      },
      nowIso,
    });
  }
  next[GLOBE_CONTEXT_REMOVED_META] = true;
  next.globeContextRemovedAt = nowIso;
  return next;
}

function collectLinkedMediaIds(event: EventCandidate | null | undefined): Set<string> {
  const ids = new Set<string>();
  for (const fragment of readFeedCaptureFragments(event)) {
    const mediaContextId = fragment.mediaContextId?.trim();
    if (mediaContextId) {
      ids.add(mediaContextId);
    }
  }
  return ids;
}

async function detachLinkedLocalMedia(input: {
  eventIds: readonly string[];
  events: readonly EventCandidate[];
}): Promise<void> {
  const eventIds = new Set(input.eventIds.map((eventId) => eventId.trim()).filter(Boolean));
  if (eventIds.size === 0) {
    return;
  }

  const mediaIds = new Set<string>();
  for (const event of input.events) {
    for (const mediaId of collectLinkedMediaIds(event)) {
      mediaIds.add(mediaId);
    }
  }

  for (const row of await listMediaSpacetimeContexts()) {
    const originRef = row.originRef?.trim();
    const mediaId = row.id.trim();
    if (!originRef || !mediaId || !eventIds.has(originRef)) {
      continue;
    }
    mediaIds.add(mediaId);
  }

  await Promise.allSettled(
    [...mediaIds].map((mediaId) => clearMediaSpacetimeOriginRef(mediaId)),
  );
}

/** Remove personal globe pin + hide experience from globe surfaces. */
export function deleteGlobeContext(eventId: string): DeleteGlobeContextResult {
  const key = eventId.trim();
  if (!key) {
    return {
      eventId: key,
      action: "blocked",
      removedPin: false,
      hidden: false,
      skipped: true,
      reason: "empty_event_id",
    };
  }

  const event = findLifeEventCandidate(key);
  if (!event) {
    const removedPin = removePersonalGlobePinByEventId(key);
    return {
      eventId: key,
      action: "delete_upstream",
      removedPin,
      hidden: removedPin,
      skipped: !removedPin,
      reason: removedPin ? undefined : "event_not_found",
    };
  }

  const action = resolveGlobeContextDeleteIntent(event);
  if (action === "blocked") {
    return {
      eventId: key,
      action,
      removedPin: false,
      hidden: false,
      skipped: true,
      reason: "delete_blocked",
    };
  }
  const removedPin = removePersonalGlobePinByEventId(key);

  if (isGlobeContextRemoved(event)) {
    return {
      eventId: key,
      action,
      removedPin,
      hidden: true,
      skipped: false,
    };
  }

  commitEventUpsert({
    id: event.id,
    description: event.description,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata: buildRemovedMetadata(event, action),
  });

  return {
    eventId: key,
    action,
    removedPin,
    hidden: true,
    skipped: false,
  };
}

export async function deleteGlobeContexts(eventIds: readonly string[]): Promise<{
  deleted: number;
  results: DeleteGlobeContextResult[];
}> {
  const eventsById = new Map(
    eventIds
      .map((eventId) => findLifeEventCandidate(eventId))
      .filter((event): event is EventCandidate => Boolean(event))
      .map((event) => [event.id, event] as const),
  );
  const results = eventIds.map((eventId) => deleteGlobeContext(eventId));
  const upstreamDeleteIds = results
    .filter((row) => row.action === "delete_upstream" && !row.skipped)
    .map((row) => row.eventId);
  await detachLinkedLocalMedia({
    eventIds: upstreamDeleteIds,
    events: upstreamDeleteIds
      .map((eventId) => eventsById.get(eventId))
      .filter((event): event is EventCandidate => Boolean(event)),
  });
  const deleted = results.filter((row) => row.hidden || row.removedPin).length;
  return { deleted, results };
}
