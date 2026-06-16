import type { EventCandidate } from "@/lib/events/event-candidate";
import { scoreSpacetimeFit } from "@/lib/feed/spacetime-fit";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { scoreHubServiceRowBase } from "@/lib/globe/context-hub/score-hub-service-row";
import {
  mapHubServiceRowToResource,
  type RankedContextResource,
} from "@/lib/globe/resource/map-hub-service-to-resource";
import type { ContextResource } from "@/lib/globe/resource/types";
import { readPlanContextFromEvent } from "@/lib/plan-context/plan-context-metadata";

function readFiniteCoord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoreResourceJit(input: {
  event: EventCandidate;
  resource: ContextResource;
  hubRow: ContextHubServiceRow;
  nowIso: string;
  lat: number | null;
  lng: number | null;
}): number {
  let score = scoreHubServiceRowBase(input.hubRow);

  const plan = readPlanContextFromEvent(input.event);
  const meta = input.event.metadata ?? {};
  const eventLat = input.resource.spacetime.lat ?? readFiniteCoord(meta.globePlaceLat);
  const eventLng = input.resource.spacetime.lng ?? readFiniteCoord(meta.globePlaceLng);

  const fit = scoreSpacetimeFit({
    capturedAtIso: input.nowIso,
    lat: input.lat,
    lng: input.lng,
    eventStartIso:
      input.resource.spacetime.validFromIso ??
      input.event.datetime ??
      input.nowIso,
    eventEndIso: input.resource.spacetime.validUntilIso ?? plan?.windowEndIso ?? null,
    eventPlace: input.resource.spacetime.placeLabel,
    eventLat,
    eventLng,
    capturedPlaceLabel: null,
  });

  if (input.resource.kind === "ticket") {
    if (fit.fits && fit.placeOk) {
      score += 140;
    } else if (fit.timeOk && fit.placeOk) {
      score += 95;
    } else if (fit.timeOk) {
      score += 55;
    }
    if (input.resource.action?.kind === "show_qr") {
      score += 25;
    }
  }

  if (input.resource.kind === "flight") {
    if (fit.timeOk && !fit.placeOk) {
      score += 45;
    }
    if (fit.timeOk && fit.placeOk) {
      score += 20;
    }
  }

  if (input.resource.kind === "ai_handoff" && fit.timeOk) {
    score += 15;
  }

  if (!input.resource.action) {
    score -= 80;
  }

  return score;
}

/** JIT rank — GPS · Now · spacetime · artifact urgency. Hub does not call this. */
export function rankContextResources(input: {
  event: EventCandidate;
  services: readonly ContextHubServiceRow[];
  now?: Date;
  lat?: number | null;
  lng?: number | null;
}): RankedContextResource[] {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;

  return input.services
    .filter((row) => row.offered)
    .map((hubRow) => {
      const resource = mapHubServiceRowToResource(input.event, hubRow);
      return {
        resource,
        hubRow,
        rankScore: scoreResourceJit({
          event: input.event,
          resource,
          hubRow,
          nowIso,
          lat,
          lng,
        }),
      };
    })
    .sort((left, right) => {
      const delta = right.rankScore - left.rankScore;
      if (delta !== 0) {
        return delta;
      }
      return left.resource.label.localeCompare(right.resource.label, "ko");
    });
}
