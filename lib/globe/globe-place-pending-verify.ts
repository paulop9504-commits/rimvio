"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export type GlobePlaceVerifySource = "gps" | "low_confidence";

export function readGlobePlacePendingVerify(
  event: EventCandidate,
): GlobePlaceVerifySource | null {
  const meta = event.metadata ?? {};
  if (meta.globePlacePendingVerify !== true) {
    return null;
  }
  const source = meta.globePlaceVerifySource;
  if (source === "gps" || source === "low_confidence") {
    return source;
  }
  return "low_confidence";
}

export function stampGlobePlacePendingVerify(
  event: EventCandidate,
  input: {
    source: GlobePlaceVerifySource;
    askGpsOff?: boolean;
  },
): EventCandidate {
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
      globePlacePendingVerify: true,
      globePlaceVerifySource: input.source,
      globePlaceVerifyAskGpsOff: input.askGpsOff === true,
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
  });
}

export function clearGlobePlacePendingVerify(event: EventCandidate): EventCandidate {
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
      globePlacePendingVerify: undefined,
      globePlaceVerifySource: undefined,
      globePlaceVerifyAskGpsOff: undefined,
    },
    lifecycleUpdatedAt: event.lifecycleUpdatedAt,
  });
}

export function shouldAskGpsOffAfterVerify(event: EventCandidate): boolean {
  return event.metadata?.globePlaceVerifyAskGpsOff === true;
}
