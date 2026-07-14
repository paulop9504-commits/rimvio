"use client";

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  mapLodgingRowToContextResource,
  readLodgingInventoryRows,
} from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { mapEateryRowToContextResource } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { upsertMirrorProvenanceMetadata } from "@/lib/globe/mirror-provenance";
import { mapPlaceRowToContextResource } from "@/lib/globe/place/map-place-row-to-context-resource";
import { emitCommittedContextResource } from "@/lib/globe/resource/emit-committed-context-resource";
import type { ContextResource } from "@/lib/globe/resource/types";
import { applyTripExperienceMainLegsMetadata } from "@/lib/globe/trip-experience/apply-trip-experience-main-legs-metadata";
import type { TripExperienceScoutLeg } from "@/lib/globe/trip-experience/build-trip-experience-parallel-scouts";
import type { TripExperienceMainLegPin } from "@/lib/globe/trip-experience/trip-experience-main-leg-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import { markLodgingResourceSelected } from "@/lib/resource-operation";

export type TripExperienceMainLegCommit = {
  readonly leg: TripExperienceScoutLeg;
  readonly recommendation: ContextConditionRecommendation;
};

function buildResourceId(
  eventId: string,
  leg: TripExperienceScoutLeg,
  placeId: string,
): string {
  return `${eventId}:${leg}:${placeId}`;
}

function resolveLegPin(input: {
  eventId: string;
  leg: TripExperienceScoutLeg;
  recommendation: ContextConditionRecommendation;
  stamp: string;
}): { pin: TripExperienceMainLegPin; resource: ContextResource } | null {
  const event = findLifeEventCandidate(input.eventId);
  if (!event) {
    return null;
  }

  if (input.leg === "lodging") {
    const row = readLodgingInventoryRows(event).find(
      (entry) => entry.placeId === input.recommendation.placeId,
    );
    if (!row) {
      return null;
    }
    const resourceId = buildResourceId(event.id, input.leg, row.placeId);
    markLodgingResourceSelected({
      contextEventId: event.id,
      resourceId,
      label: row.name,
    });
    const pin: TripExperienceMainLegPin = {
      kind: "lodging",
      resourceId,
      placeId: row.placeId,
      label: row.name,
      pinnedAtIso: input.stamp,
      lat: row.lat,
      lng: row.lng,
      mapsUrl: row.mapsUrl ?? null,
      previewUrl: row.images[0] ?? row.videoUrl ?? null,
    };
    return {
      pin,
      resource: mapLodgingRowToContextResource(event, row),
    };
  }

  if (input.leg === "eatery") {
    const row = readEateryInventoryRows(event).find(
      (entry) => entry.placeId === input.recommendation.placeId,
    );
    if (!row) {
      return null;
    }
    const resourceId = buildResourceId(event.id, input.leg, row.placeId);
    const pin: TripExperienceMainLegPin = {
      kind: "eatery",
      resourceId,
      placeId: row.placeId,
      label: row.name,
      pinnedAtIso: input.stamp,
      lat: row.lat,
      lng: row.lng,
      mapsUrl: row.mapsUrl ?? null,
      previewUrl: row.images[0] ?? null,
    };
    return {
      pin,
      resource: mapEateryRowToContextResource(event, row),
    };
  }

  const row = readEateryInventoryRows(event).find(
    (entry) => entry.placeId === input.recommendation.placeId,
  );
  if (!row) {
    return null;
  }
  const resourceId = buildResourceId(event.id, input.leg, row.placeId);
  const pin: TripExperienceMainLegPin = {
    kind: "activity",
    resourceId,
    placeId: row.placeId,
    label: row.name,
    pinnedAtIso: input.stamp,
    lat: row.lat,
    lng: row.lng,
    mapsUrl: row.mapsUrl ?? null,
    previewUrl: row.images[0] ?? null,
  };
  return {
    pin,
    resource: mapPlaceRowToContextResource(event, row, "activity"),
  };
}

/** Pin rank-1 per scout leg in one metadata commit (no sibling overwrite). */
export function pinTripExperienceMainLegsToContext(input: {
  eventId: string;
  legs: readonly TripExperienceMainLegCommit[];
  primaryLeg: TripExperienceScoutLeg;
}): EventCandidate {
  const eventId = input.eventId.trim();
  const event = findLifeEventCandidate(eventId);
  if (!event) {
    throw new Error("event_not_found");
  }
  if (input.legs.length === 0) {
    throw new Error("trip_experience_main_legs_empty");
  }

  const stamp = new Date().toISOString();
  const legPins: Partial<Record<TripExperienceScoutLeg, TripExperienceMainLegPin>> = {};
  const resources: ContextResource[] = [];

  for (const row of input.legs) {
    const resolved = resolveLegPin({
      eventId,
      leg: row.leg,
      recommendation: row.recommendation,
      stamp,
    });
    if (!resolved) {
      continue;
    }
    legPins[row.leg] = resolved.pin;
    resources.push(resolved.resource);
  }

  if (Object.keys(legPins).length === 0) {
    throw new Error("trip_experience_main_legs_unresolved");
  }

  const primaryLeg =
    input.primaryLeg in legPins ? input.primaryLeg : (Object.keys(legPins)[0] as TripExperienceScoutLeg);

  const baseMetadata = applyTripExperienceMainLegsMetadata({
    metadata: event.metadata,
    legs: legPins,
    primaryLeg,
  });
  const metadata = upsertMirrorProvenanceMetadata({
    metadata: baseMetadata,
    patch: {
      sync: {
        state: "synced",
        lastSyncedAtIso: stamp,
      },
    },
    audit: {
      action: "local_context_edited",
      subject: {
        eventId: event.id,
        nodeId: `trip-experience-main:${primaryLeg}`,
      },
      diff: Object.keys(legPins).map((leg) => `pinned:${leg}`),
    },
    nowIso: stamp,
  });

  let pinned = commitEventUpsert({
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
    metadata,
  });

  for (const resource of resources) {
    pinned = emitCommittedContextResource({
      contextEventId: pinned.id,
      resource,
    });
  }

  return pinned;
}
