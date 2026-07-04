import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import { readPinnedLodgingResourceId } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import {
  CONTEXT_LODGING_RECOMMEND_SCORES_META_KEY,
  type LodgingRecommendScoreWire,
} from "@/lib/globe/context-hub/lodging-resource-types";
import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import type { ContextResource } from "@/lib/globe/resource/types";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";

function syntheticLodgingHubRow(
  event: EventCandidate,
  resource: ContextResource,
): ContextHubServiceRow {
  return {
    serviceId: "lodging",
    labelKo: resource.label,
    shortLabelKo: resource.shortLabel ?? "숙소",
    implemented: true,
    offered: true,
    connected: true,
    link: {
      eventId: event.id,
      kind: "departure_airport",
      label: resource.label,
      shortLabel: resource.shortLabel ?? "숙소",
      airportIata: null,
      actionUrl: resource.action?.href ?? null,
      actionLabelKo: resource.action?.labelKo ?? "숙소 보기",
    },
    flightOptions: [],
    handoffHref: resource.action?.href ?? null,
    handoffLabelKo: resource.action?.labelKo ?? null,
  };
}

function readRecommendScores(
  event: EventCandidate,
): Record<string, LodgingRecommendScoreWire> {
  const raw = event.metadata?.[CONTEXT_LODGING_RECOMMEND_SCORES_META_KEY];
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as Record<string, LodgingRecommendScoreWire>;
}

function scoreLodgingByGps(input: {
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
  if (distanceKm <= 1) {
    score += 120;
  } else if (distanceKm <= 3) {
    score += 95;
  } else if (distanceKm <= 8) {
    score += 55;
  } else if (distanceKm <= 15) {
    score += 20;
  }

  if (input.resource.metadata?.lodging && typeof input.resource.metadata.lodging === "object") {
    const lodging = input.resource.metadata.lodging as { videoUrl?: string | null };
    if (lodging.videoUrl) {
      score += 12;
    }
  }

  if (input.recommendBonus != null && input.recommendBonus > 0) {
    score += input.recommendBonus;
  }

  return score;
}

/** JIT rank for lodging inventory — GPS distance primary. */
export function rankLodgingResources(input: {
  event: EventCandidate;
  resources: readonly ContextResource[];
  lat?: number | null;
  lng?: number | null;
}): RankedContextResource[] {
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const recommendScores = readRecommendScores(input.event);
  const pinnedResourceId = readPinnedLodgingResourceId(input.event);

  return input.resources
    .map((resource) => {
      const hubRow = syntheticLodgingHubRow(input.event, resource);
      const lodgingMeta = resource.metadata?.lodging;
      const placeId =
        lodgingMeta && typeof lodgingMeta === "object" && "placeId" in lodgingMeta
          ? String((lodgingMeta as { placeId?: string }).placeId ?? "")
          : "";
      const recommendBonus = placeId ? (recommendScores[placeId]?.score ?? 0) : 0;
      return {
        resource,
        hubRow,
        rankScore:
          scoreLodgingByGps({ resource, lat, lng, recommendBonus }) +
          (pinnedResourceId === resource.resourceId ? 220 : 0),
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
