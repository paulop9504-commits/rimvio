import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import {
  CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY,
  type EateryRecommendScoreWire,
} from "@/lib/globe/eatery/eatery-resource-types";
import type { ContextResource } from "@/lib/globe/resource/types";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";

function syntheticEateryHubRow(
  event: EventCandidate,
  resource: ContextResource,
): ContextHubServiceRow {
  return {
    serviceId: "ticket",
    labelKo: resource.label,
    shortLabelKo: resource.shortLabel ?? "맛집",
    implemented: true,
    offered: true,
    connected: true,
    link: null,
    flightOptions: [],
    handoffHref: resource.action?.href ?? null,
    handoffLabelKo: resource.action?.labelKo ?? null,
  };
}

function readRecommendScores(
  event: EventCandidate,
): Record<string, EateryRecommendScoreWire> {
  const raw = event.metadata?.[CONTEXT_EATERY_RECOMMEND_SCORES_META_KEY];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as Record<string, EateryRecommendScoreWire>;
}

function scoreEateryByGps(input: {
  resource: ContextResource;
  lat: number | null;
  lng: number | null;
  recommendBonus?: number;
}): number {
  let score = 60;
  const rLat = input.resource.spacetime.lat;
  const rLng = input.resource.spacetime.lng;
  if (
    input.lat == null ||
    input.lng == null ||
    rLat == null ||
    rLng == null ||
    !Number.isFinite(rLat) ||
    !Number.isFinite(rLng)
  ) {
    if (input.recommendBonus != null && input.recommendBonus > 0) {
      score += input.recommendBonus;
    }
    return score;
  }

  const distanceKm = haversineKm(input.lat, input.lng, rLat, rLng);
  if (distanceKm <= 0.5) {
    score += 130;
  } else if (distanceKm <= 1) {
    score += 100;
  } else if (distanceKm <= 3) {
    score += 60;
  } else if (distanceKm <= 8) {
    score += 25;
  }

  if (input.recommendBonus != null && input.recommendBonus > 0) {
    score += input.recommendBonus;
  }

  return score;
}

/** JIT rank for eatery inventory — GPS distance + composer scores. */
export function rankEateryResources(input: {
  event: EventCandidate;
  resources: readonly ContextResource[];
  lat?: number | null;
  lng?: number | null;
}): RankedContextResource[] {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const recommendScores = readRecommendScores(input.event);

  return input.resources
    .map((resource) => {
      const hubRow = syntheticEateryHubRow(input.event, resource);
      const eateryMeta = resource.metadata?.eatery;
      const placeId =
        eateryMeta && typeof eateryMeta === "object" && "placeId" in eateryMeta
          ? String((eateryMeta as { placeId?: string }).placeId ?? "")
          : "";
      const recommendBonus = placeId ? (recommendScores[placeId]?.score ?? 0) : 0;
      return {
        resource,
        hubRow,
        rankScore: scoreEateryByGps({ resource, lat, lng, recommendBonus }),
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
