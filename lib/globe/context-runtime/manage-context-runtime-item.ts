"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { clearPinnedContextItemMetadata } from "@/lib/globe/context-pinned-item";
import type { ContextRuntimeManageAction } from "@/lib/globe/context-runtime/types";
import { removePersonalGlobePinByEventId } from "@/lib/globe/personal-globe-pin-store";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import {
  queryMediaGuidesForEvent,
  replaceMediaGuidesForExperience,
} from "@/lib/ontology/media-guide-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function unpinContextRuntimeSelection(eventId: string): EventCandidate | null {
  const event = findLifeEventCandidate(eventId.trim());
  if (!event) {
    return null;
  }
  const metadata = clearPinnedContextItemMetadata(event.metadata);
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    containerId: event.containerId,
    confidence: event.confidence,
    metadata,
    lifecycleUpdatedAt: event.lifecycleUpdatedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function removeContextRuntimeGlobePin(pinEventId: string): boolean {
  return removePersonalGlobePinByEventId(pinEventId.trim());
}

export function removeContextRuntimeMediaGuide(input: {
  eventId: string;
  guideNodeId: string;
}): boolean {
  const eventId = input.eventId.trim();
  const guideNodeId = input.guideNodeId.trim();
  if (!eventId || !guideNodeId) {
    return false;
  }
  const remaining = queryMediaGuidesForEvent(eventId).filter(
    (guide) => guide.guideNodeId !== guideNodeId,
  );
  if (remaining.length === queryMediaGuidesForEvent(eventId).length) {
    return false;
  }
  replaceMediaGuidesForExperience({
    experienceEntityId: asRimvioEntityId("experience", eventId),
    guides: remaining,
  });
  return true;
}

export function runContextRuntimeManageAction(input: {
  eventId: string;
  action: ContextRuntimeManageAction;
  pinEventId?: string | null;
  guideNodeId?: string | null;
}): boolean {
  switch (input.action) {
    case "unpin":
      return unpinContextRuntimeSelection(input.eventId) != null;
    case "remove_pin": {
      const pinEventId = input.pinEventId?.trim();
      return pinEventId ? removeContextRuntimeGlobePin(pinEventId) : false;
    }
    case "remove_media": {
      const guideNodeId = input.guideNodeId?.trim();
      return guideNodeId
        ? removeContextRuntimeMediaGuide({
            eventId: input.eventId,
            guideNodeId,
          })
        : false;
    }
    case "fly":
      return true;
    default:
      return false;
  }
}
