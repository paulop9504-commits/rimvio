/**
 * Hub factory — emit committed ContextResource after Reality Commit (pin / binding).
 * Inventory / Ghost / scout candidates are NOT written here.
 *
 * @see docs/GLOBE_HUB_RESOURCE.md — 3-Layer Storage Model
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findEventCandidate } from "@/lib/events/event-store";
import type { ContextResource } from "@/lib/globe/resource/types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const CONTEXT_COMMITTED_RESOURCES_META_KEY = "contextCommittedResources";

const MAX_COMMITTED = 80;

function parseOne(raw: unknown): ContextResource | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const resourceId =
    typeof row.resourceId === "string" && row.resourceId.trim()
      ? row.resourceId.trim()
      : null;
  const contextEventId =
    typeof row.contextEventId === "string" && row.contextEventId.trim()
      ? row.contextEventId.trim()
      : null;
  const kind = typeof row.kind === "string" ? row.kind : null;
  const sourceHubId =
    typeof row.sourceHubId === "string" && row.sourceHubId.trim()
      ? row.sourceHubId.trim()
      : null;
  const label =
    typeof row.label === "string" && row.label.trim() ? row.label.trim() : null;
  const createdAtIso =
    typeof row.createdAtIso === "string" && row.createdAtIso.trim()
      ? row.createdAtIso.trim()
      : null;
  if (
    !resourceId ||
    !contextEventId ||
    !kind ||
    !sourceHubId ||
    !label ||
    !createdAtIso
  ) {
    return null;
  }
  return row as ContextResource;
}

export function readCommittedContextResources(
  event: EventCandidate | null | undefined,
): ContextResource[] {
  if (!event) {
    return [];
  }
  const raw = event.metadata?.[CONTEXT_COMMITTED_RESOURCES_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parseOne).filter((row): row is ContextResource => row != null);
}

/**
 * Upsert one committed Resource on Context metadata (file in folder).
 * Replaces same resourceId; never writes from scout inventory alone.
 */
export function emitCommittedContextResource(input: {
  contextEventId: string;
  resource: ContextResource;
}): EventCandidate {
  const contextEventId = input.contextEventId.trim();
  const event = findEventCandidate(contextEventId);
  if (!event) {
    throw new Error("context_event_not_found");
  }
  if (input.resource.contextEventId.trim() !== event.id) {
    throw new Error("resource_context_mismatch");
  }

  const stamp = new Date().toISOString();
  const resource: ContextResource = {
    ...input.resource,
    contextEventId: event.id,
    updatedAtIso: stamp,
    createdAtIso: input.resource.createdAtIso || stamp,
  };

  const prior = readCommittedContextResources(event).filter(
    (row) => row.resourceId !== resource.resourceId,
  );
  const next = [...prior, resource];
  const capped =
    next.length > MAX_COMMITTED
      ? next.slice(next.length - MAX_COMMITTED)
      : next;

  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
    metadata: {
      ...(event.metadata ?? {}),
      [CONTEXT_COMMITTED_RESOURCES_META_KEY]: capped,
      feedPlanEnabled: event.metadata?.feedPlanEnabled ?? true,
    },
  });
}
