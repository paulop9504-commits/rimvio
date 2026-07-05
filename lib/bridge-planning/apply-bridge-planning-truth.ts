import type { EventCandidate } from "@/lib/events/event-candidate";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import { stampCanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import {
  BRIDGE_PLANNING_TRUTH_META_KEY,
  type BridgePlanningTruthV1,
} from "@/lib/bridge-planning/types";
import { readBridgePlanningTruth } from "@/lib/bridge-planning/read-bridge-planning-truth";
import { appendBridgePlanningHistory } from "@/lib/bridge-planning/planning-history";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function buildBridgePlanningTruthPatch(input: {
  event: EventCandidate;
  updatedByUserId: string;
  destinationLabel: string;
  pathLabels: readonly string[];
  pinnedLegIndex: number;
  goalKo?: string | null;
  flowStrokeStyle?: "solid" | "dashed";
}): BridgePlanningTruthV1 {
  const anchor = resolveTripContextAnchor(input.destinationLabel);
  const previous = readBridgePlanningTruth(input.event);
  const nowIso = new Date().toISOString();

  return {
    version: 1,
    revision: (previous?.revision ?? 0) + 1,
    updatedByUserId: input.updatedByUserId.trim(),
    updatedAtIso: nowIso,
    goalKo: input.goalKo?.trim() || input.event.title.trim() || null,
    destination: {
      label: anchor?.placeLabel ?? input.destinationLabel.trim(),
      lat: anchor?.lat ?? null,
      lng: anchor?.lng ?? null,
      resolution: "confirmed",
    },
    pathLabels: [...input.pathLabels],
    pinnedLegIndex: input.pinnedLegIndex,
    flowStrokeStyle: input.flowStrokeStyle ?? "solid",
  };
}

export function applyBridgePlanningTruthToEvent(input: {
  event: EventCandidate;
  truth: BridgePlanningTruthV1;
}): EventCandidate {
  const anchor = resolveTripContextAnchor(input.truth.destination.label);
  const placeLabel = input.truth.destination.label;
  const metadataSeed: Record<string, unknown> = {
    ...(input.event.metadata ?? {}),
    [BRIDGE_PLANNING_TRUTH_META_KEY]: input.truth,
    feedPlanEnabled: true,
  };

  if (anchor) {
    metadataSeed.globePlaceConfirmed = true;
    metadataSeed.globePlaceLat = anchor.lat;
    metadataSeed.globePlaceLng = anchor.lng;
    metadataSeed.globePlaceLabel = anchor.placeLabel;
    metadataSeed.globePlaceCardLat = anchor.lat;
    metadataSeed.globePlaceCardLng = anchor.lng;
    metadataSeed.globePlaceCardLabel = anchor.placeLabel;
  }

  const metadata = anchor
    ? stampCanonicalPlaceProfile(metadataSeed, anchor.profile)
    : metadataSeed;

  const withHistory = appendBridgePlanningHistory({
    metadata: metadata as Record<string, unknown>,
    truth: input.truth,
  });

  return {
    ...input.event,
    place: placeLabel,
    metadata: withHistory,
    updatedAt: input.truth.updatedAtIso,
  };
}

export function mergeBridgePlanningTruthFromRemote(input: {
  event: EventCandidate;
  remoteEvent: EventCandidate;
}): EventCandidate | null {
  const local = readBridgePlanningTruth(input.event);
  const remote = readBridgePlanningTruth(input.remoteEvent);
  if (!remote) {
    return null;
  }
  if (local && local.revision >= remote.revision) {
    return null;
  }

  const nextEvent = applyBridgePlanningTruthToEvent({
    event: input.event,
    truth: remote,
  });

  return commitEventUpsert({
    id: nextEvent.id,
    title: nextEvent.title,
    category: nextEvent.category,
    source: nextEvent.source,
    lifecycle: nextEvent.lifecycle,
    datetime: nextEvent.datetime,
    place: nextEvent.place,
    description: nextEvent.description,
    containerId: nextEvent.containerId,
    confidence: nextEvent.confidence,
    metadata: nextEvent.metadata,
    lifecycleUpdatedAt: nextEvent.lifecycleUpdatedAt ?? remote.updatedAtIso,
    updatedAt: remote.updatedAtIso,
  });
}
