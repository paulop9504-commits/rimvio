import { copy } from "@/lib/copy/human-ko";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import {
  buildLodgingStayWindow,
  formatLodgingStayWindowLabel,
  resolveLodgingStayPhase,
  type LodgingStayPhase,
} from "@/lib/globe/context-hub/lodging-stay-window";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import type { ContextEateryInventoryRow } from "@/lib/globe/eatery/eatery-resource-types";

const WALKABLE_MAX_KM = 1.4;
const VERY_CLOSE_KM = 0.18;

export type LodgingEateryRelationSummary = {
  anchorResourceId: string;
  anchorName: string;
  distanceKm: number;
  badgeLabelKo: string;
  summaryKo: string;
  stayWindowLabelKo: string | null;
  stayPhase: LodgingStayPhase;
};

function buildLodgingResourceId(eventId: string, placeId: string): string {
  return `${eventId}:lodging:${placeId}`;
}

function estimateWalkMinutes(distanceKm: number): number {
  return Math.max(3, Math.round(distanceKm * 14));
}

function estimateRideMinutes(distanceKm: number): number {
  return Math.max(6, Math.round(distanceKm * 3.2 + 4));
}

function pickAnchorRow(input: {
  event: EventCandidate;
  lodgingRows: readonly ContextLodgingInventoryRow[];
  preferredResourceId?: string | null;
}): ContextLodgingInventoryRow | null {
  const preferredId = input.preferredResourceId?.trim();
  if (preferredId) {
    const matched = input.lodgingRows.find(
      (row) => buildLodgingResourceId(input.event.id, row.placeId) === preferredId,
    );
    if (matched) {
      return matched;
    }
  }
  return input.lodgingRows[0] ?? null;
}

function buildPhaseFitSentence(
  phase: LodgingStayPhase,
  walkable: boolean,
): string {
  const globe = copy.globe;
  const effectivePhase = phase === "pre_checkin" ? "check_in_day" : phase;
  switch (effectivePhase) {
    case "check_in_day":
      return walkable
        ? globe.eateryRelationCheckinWalk
        : globe.eateryRelationCheckinRide;
    case "last_night":
      return walkable
        ? globe.eateryRelationLastNightWalk
        : globe.eateryRelationLastNightRide;
    case "checkout_day":
      return walkable
        ? globe.eateryRelationCheckoutWalk
        : globe.eateryRelationCheckoutRide;
    case "mid_stay":
    case "unknown":
    default:
      return walkable
        ? globe.eateryRelationMidStayWalk
        : globe.eateryRelationMidStayRide;
  }
}

export function describeLodgingEateryRelation(input: {
  event: EventCandidate;
  eatery: ContextEateryInventoryRow;
  lodgingRows: readonly ContextLodgingInventoryRow[];
  preferredLodgingResourceId?: string | null;
  now?: Date;
}): LodgingEateryRelationSummary | null {
  const anchorRow = pickAnchorRow({
    event: input.event,
    lodgingRows: input.lodgingRows,
    preferredResourceId: input.preferredLodgingResourceId,
  });
  if (!anchorRow) {
    return null;
  }

  const distanceKm = haversineKm(
    anchorRow.lat,
    anchorRow.lng,
    input.eatery.lat,
    input.eatery.lng,
  );
  const walkable = distanceKm <= WALKABLE_MAX_KM;
  const stayWindow = buildLodgingStayWindow({ event: input.event, row: anchorRow });
  const stayPhase = resolveLodgingStayPhase(stayWindow, input.now);
  const stayWindowLabelKo = formatLodgingStayWindowLabel(stayWindow);
  const globe = copy.globe;

  let badgeLabelKo: string;
  let leadSentence: string;
  if (distanceKm <= VERY_CLOSE_KM) {
    badgeLabelKo = globe.eateryRelationNearBadge;
    leadSentence = globe.eateryRelationNextToLodging;
  } else if (walkable) {
    const walkMinutes = estimateWalkMinutes(distanceKm);
    badgeLabelKo = globe.eateryRelationWalkBadge(walkMinutes);
    leadSentence = globe.eateryRelationWalkFromLodging(walkMinutes);
  } else {
    const rideMinutes = estimateRideMinutes(distanceKm);
    badgeLabelKo = globe.eateryRelationRideBadge(rideMinutes);
    leadSentence = globe.eateryRelationRideFromLodging(rideMinutes);
  }

  return {
    anchorResourceId: buildLodgingResourceId(input.event.id, anchorRow.placeId),
    anchorName: anchorRow.name,
    distanceKm,
    badgeLabelKo,
    summaryKo: `${leadSentence} ${buildPhaseFitSentence(stayPhase, walkable)}`.trim(),
    stayWindowLabelKo,
    stayPhase,
  };
}
