import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type {
  ExperienceScenarioOrderingMode,
  ExperienceScenarioResourceKind,
} from "@/lib/globe/experience-simulation/types";

export type ScenarioPlaceCandidate = {
  placeId: string;
  title: string;
  lat: number;
  lng: number;
  resourceKind: ExperienceScenarioResourceKind;
  rank: number;
};

const WALK_KMH = 5;
const EATERY_DWELL_MIN = 75;
const LODGING_DWELL_MIN = 45;

export function estimateWalkMinutes(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  return Math.max(3, Math.round((km / WALK_KMH) * 60));
}

export function resolveDwellMinutes(
  resourceKind: ExperienceScenarioResourceKind,
): number {
  if (resourceKind === "lodging") {
    return LODGING_DWELL_MIN;
  }
  if (resourceKind === "eatery") {
    return EATERY_DWELL_MIN;
  }
  return 0;
}

function toCandidates(
  recommendations: readonly ContextConditionRecommendation[],
): ScenarioPlaceCandidate[] {
  return recommendations.map((row, index) => ({
    placeId: row.placeId,
    title: row.title,
    lat: row.lat,
    lng: row.lng,
    resourceKind: row.kind,
    rank: row.rank || index + 1,
  }));
}

function orderNearestNeighbor(
  origin: { lat: number; lng: number },
  candidates: ScenarioPlaceCandidate[],
): ScenarioPlaceCandidate[] {
  const remaining = [...candidates];
  const ordered: ScenarioPlaceCandidate[] = [];
  let cursor = origin;
  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [index, point] of remaining.entries()) {
      const distance = haversineKm(cursor.lat, cursor.lng, point.lat, point.lng);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    const next = remaining.splice(bestIndex, 1)[0]!;
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}

function orderBalanced(candidates: ScenarioPlaceCandidate[]): ScenarioPlaceCandidate[] {
  return [...candidates].sort((left, right) => left.rank - right.rank);
}

function orderStayLast(candidates: ScenarioPlaceCandidate[]): ScenarioPlaceCandidate[] {
  const eateries = candidates
    .filter((row) => row.resourceKind === "eatery")
    .sort((left, right) => left.rank - right.rank);
  const lodgings = candidates
    .filter((row) => row.resourceKind === "lodging")
    .sort((left, right) => left.rank - right.rank);
  return [...eateries, ...lodgings];
}

export function orderScenarioCandidates(input: {
  mode: ExperienceScenarioOrderingMode;
  anchorLat: number;
  anchorLng: number;
  recommendations: readonly ContextConditionRecommendation[];
}): ScenarioPlaceCandidate[] {
  const candidates = toCandidates(input.recommendations);
  if (candidates.length === 0) {
    return [];
  }
  switch (input.mode) {
    case "quick":
      return orderNearestNeighbor(
        { lat: input.anchorLat, lng: input.anchorLng },
        candidates,
      );
    case "stay_last":
      return orderStayLast(candidates);
    case "balanced":
    default:
      return orderBalanced(candidates);
  }
}
