import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  readContextSpatialTarget,
  stampContextSpatialTargetMetadata,
  type ContextSpatialTargetWire,
} from "@/lib/globe/spatial/context-spatial-target-metadata";
import { resolveSpatialTargetFromText } from "@/lib/globe/spatial/resolve-spatial-target-from-text";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

/** Parse utterance → persist spatial POV on Context metadata. */
export function writeContextSpatialTargetFromText(input: {
  contextEventId: string;
  text: string;
}): { event: EventCandidate | null; target: ContextSpatialTargetWire | null } {
  const contextEventId = input.contextEventId.trim();
  const target = resolveSpatialTargetFromText(input.text);
  if (!contextEventId || !target) {
    return { event: null, target: null };
  }

  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return { event: null, target: null };
  }

  const updatedAt = new Date().toISOString();
  const next = commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: target.label,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: updatedAt,
    updatedAt,
    metadata: stampContextSpatialTargetMetadata(event.metadata ?? {}, target),
  });

  return { event: next, target };
}

export function readContextSpatialTargetFromEvent(
  event: EventCandidate | null | undefined,
): ContextSpatialTargetWire | null {
  return readContextSpatialTarget(event?.metadata ?? null);
}
