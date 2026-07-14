import type { ContextInstance } from "@/lib/context-instance/build-context-instance";
import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { UnifiedExperienceContext } from "@/lib/experience-context/unified-experience-context-types";
import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import { resolveContextLodgingDestinationAnchor } from "@/lib/globe/context-hub/resolve-context-lodging-search-coords";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import {
  buildLodgingOpportunityInsight,
  isLodgingValueLeaning,
  medianLodgingPriceKrw,
} from "@/lib/globe/lodging/build-lodging-opportunity-insight";
import {
  filterVerifiedLodgingRows,
  lodgingVerificationModeFromExploration,
  type LodgingVerificationMode,
  verifyLodgingCandidate,
} from "@/lib/globe/lodging/verify-lodging-candidate";
import { copy } from "@/lib/copy/human-ko";
import type { ExplorationPolicyKnobs } from "@/lib/globe/discovery-policy/apply-exploration-mode";
import { explorationScoreBias } from "@/lib/globe/discovery-policy/exploration-score-bias";
import {
  diversifyScoredRecommendations,
  lodgingChainScorePenalty,
} from "@/lib/globe/discovery-policy/diversify-scored-recommendations";
import {
  explainLodgingRecommendationKo,
  type LodgingRecommendReasonInput,
} from "@/lib/globe/lodging/explain-lodging-recommendation-ko";
import type { LodgingRankProfile } from "@/lib/globe/lodging/lodging-rank-profile";
import { passesMinReviewCountGate } from "@/lib/places/min-review-count-gate";
import {
  applyLodgingRankContextHints,
  DEFAULT_LODGING_RANK_WEIGHTS,
} from "@/lib/globe/lodging/lodging-rank-profile";
import {
  describeLodgingRankTravelBrainAxes,
  resolveLodgingRankProfileForEvent,
} from "@/lib/globe/lodging/resolve-lodging-rank-profile-from-travel-brain";
import { scoreBusinessTripLodgingBias } from "@/lib/globe/lodging/score-business-trip-lodging-bias";
import {
  computeWeightedLodgingRankScore,
  inferLodgingPriorityFromContext,
  scoreLodgingRowDimensions,
} from "@/lib/globe/lodging/score-lodging-row-dimensions";
import { findLatestPersonaSignal } from "@/lib/persona/persona-inference-store";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type {
  TravelBrainState,
  TravelBudgetBand,
  TravelLodgingPriority,
} from "@/lib/situation-projection/travel-brain-personalization";
import { buildTravelBrainState } from "@/lib/situation-projection/travel-brain-personalization";

export type ScoredLodgingRecommendation = {
  row: ContextLodgingInventoryRow;
  score: number;
  reasonKo: string;
  matchReasons: string[];
};

function normalizePlaceToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, "");
}

function findPeoplePlaceMatch(
  row: ContextLodgingInventoryRow,
  unified: UnifiedExperienceContext,
): { displayName: string; placeLabel: string } | null {
  const lodgingToken = normalizePlaceToken(row.name);
  if (!lodgingToken) {
    return null;
  }

  for (const slice of unified.personExperienceSlice) {
    for (const place of slice.places) {
      const label = place.label?.trim();
      if (!label) {
        continue;
      }
      const placeToken = normalizePlaceToken(label);
      if (
        lodgingToken.includes(placeToken) ||
        placeToken.includes(lodgingToken) ||
        lodgingToken.includes(placeToken.slice(0, Math.min(4, placeToken.length)))
      ) {
        return { displayName: slice.displayName, placeLabel: label };
      }
    }
  }
  return null;
}

function titleMatchReasons(input: {
  row: ContextLodgingInventoryRow;
  context?: ContextInstance;
  distanceKm: number | null;
}): string[] {
  const title = input.context?.title;
  if (!title) {
    return [];
  }
  const blob = [input.row.name, input.row.partnerLabel, input.row.address]
    .filter(Boolean)
    .join(" ");
  const reasons: string[] = [];

  if (
    title.searchBias.comfortBias === "comfort" &&
    /suite|family|residence|kids|quiet|garden|stay|조용|패밀리|스위트|레지던스/u.test(blob)
  ) {
    reasons.push("가족 동선에 편한 숙소예요");
  }
  if (
    title.searchBias.comfortBias === "practical" &&
    /station|terminal|business|quiet|역|터미널|비즈니스|조용/u.test(blob)
  ) {
    reasons.push("외근 흐름에 실용적인 숙소예요");
  }
  if (
    (title.timeCues.includes("first_day") ||
      title.timeCues.includes("arrival") ||
      title.timeCues.includes("late_night")) &&
    /station|airport|terminal|check-?in|역|공항|터미널/u.test(blob)
  ) {
    reasons.push("첫날 이동 동선에 무리가 적어요");
  }
  if (title.searchBias.proximityBias === "anchor_tight" && input.distanceKm != null) {
    if (input.distanceKm <= 1.5) {
      reasons.push("제목이 가리키는 중심 동선에 가까워요");
    }
  }
  return reasons.slice(0, 2);
}

/** Strong contextual overlays outside the four profile dimensions. */
function scoreLodgingContextualOverlay(input: {
  peoplePlaceMatch: { displayName: string; placeLabel: string } | null;
  travelTrajectory: boolean;
  businessDelta: number;
}): number {
  let overlay = 0;
  if (input.peoplePlaceMatch) {
    overlay += 34;
  }
  if (input.travelTrajectory) {
    overlay += 8;
  }
  overlay += input.businessDelta * 0.55;
  return Math.round(overlay);
}

/** Unified context + GPS + profile — weighted dimension rank with L1 copy. */
export function scoreLodgingRecommendations(input: {
  rows: readonly ContextLodgingInventoryRow[];
  unifiedContext: UnifiedExperienceContext;
  lat?: number | null;
  lng?: number | null;
  context?: ContextInstance;
  event?: EventCandidate | null;
  travelBrain?: TravelBrainState | null;
  rankProfile?: LodgingRankProfile | null;
  /** Hard verification gate — default strict; diffuse → relaxed. */
  verificationMode?: LodgingVerificationMode | null;
  exploration?: ExplorationPolicyKnobs | null;
}): ScoredLodgingRecommendation[] {
  const verificationMode =
    input.verificationMode ??
    lodgingVerificationModeFromExploration(input.exploration?.mode);
  const verifiedPool = filterVerifiedLodgingRows({
    rows: input.rows,
    mode: verificationMode,
  });
  const rows = verifiedPool.kept.filter((row) =>
    passesMinReviewCountGate({
      reviewCount: row.reviewCount,
      source: row.provider ?? row.partnerLabel ?? null,
      knownOnly: true,
    }),
  );
  const lat = input.lat ?? null;
  const lng = input.lng ?? null;
  const event =
    input.event ??
    (input.context?.eventId
      ? findLifeEventCandidate(input.context.eventId)
      : null);
  const travelBrain =
    input.travelBrain ?? (event ? buildTravelBrainState(event) : null);
  const rankProfile =
    input.rankProfile ??
    (event
      ? resolveLodgingRankProfileForEvent({
          event,
          travelBrain,
        })
      : null);
  let profile = rankProfile ?? {
    mode: "auto" as const,
    weights: DEFAULT_LODGING_RANK_WEIGHTS,
    source: "default" as const,
  };
  const brainAxes = travelBrain
    ? describeLodgingRankTravelBrainAxes(travelBrain)
    : null;
  const contextPriority = inferLodgingPriorityFromContext(input.context);
  const lodgingPriority: TravelLodgingPriority | null =
    brainAxes?.lodgingPriority ??
    contextPriority ??
    ((findLatestPersonaSignal("travel.lodging_priority")?.value as
      | TravelLodgingPriority
      | undefined) ??
      null);
  const budgetBand: TravelBudgetBand | null =
    brainAxes?.budgetBand ??
    ((findLatestPersonaSignal("travel.budget_band")?.value as
      | TravelBudgetBand
      | undefined) ??
      null);
  if (!event && contextPriority && profile.mode === "auto") {
    profile = applyLodgingRankContextHints(profile, {
      lodgingPriority: contextPriority,
    });
  }
  const trajectory = input.unifiedContext.behaviorKernel.state.trajectory;
  const travelTrajectory =
    trajectory.dominant_cluster === "travel" && trajectory.strength >= 0.15;
  const valueLeaning = isLodgingValueLeaning({
    mode: profile.mode,
    budgetBand,
    lodgingPriority,
    priceWeight: profile.weights.price,
  });
  const hub = event ? resolveContextLodgingDestinationAnchor(event) : null;
  const overseas = event
    ? classifyOverseasManualPlace(
        event.place?.trim() || event.title.trim(),
      )?.isOverseas === true
    : false;
  const cohortMedianPriceKrw = medianLodgingPriceKrw(
    rows.map((row) => row.priceKrw),
  );

  const scored = rows.map((row) => {
    const peoplePlaceMatch = findPeoplePlaceMatch(row, input.unifiedContext);
    const { dimensions, distanceKm } = scoreLodgingRowDimensions({
      row,
      lat,
      lng,
      lodgingPriority,
      budgetBand,
      context: input.context,
      valueForMoney: valueLeaning,
      cohortMedianPriceKrw,
    });
    const coreScore = computeWeightedLodgingRankScore(dimensions, profile);
    const businessBias = scoreBusinessTripLodgingBias({
      row,
      event: input.event,
      povLat: lat,
      povLng: lng,
    });
    const titleReasons = titleMatchReasons({ row, context: input.context, distanceKm });
    const overlay = scoreLodgingContextualOverlay({
      peoplePlaceMatch,
      travelTrajectory,
      businessDelta: businessBias.delta,
    });
    const verification = verifyLodgingCandidate({
      row,
      mode: verifiedPool.modeApplied === "off" ? "off" : verifiedPool.modeApplied,
    });
    const explorationDelta = input.exploration
      ? explorationScoreBias({
          knobs: input.exploration,
          rating: null,
          labels: [row.name, row.partnerLabel, row.address],
        })
      : 0;
    const score =
      coreScore +
      overlay +
      explorationDelta -
      lodgingChainScorePenalty(row.name) +
      (verification.score100 >= 72 ? 6 : verification.score100 >= 58 ? 3 : 0);

    const opportunity =
      hub != null
        ? buildLodgingOpportunityInsight({
            lodgingLat: row.lat,
            lodgingLng: row.lng,
            hubLat: hub.lat,
            hubLng: hub.lng,
            priceKrw: row.priceKrw ?? null,
            cohortMedianPriceKrw,
            lodgingPriority,
            budgetBand,
            rankMode: profile.mode,
            overseas,
          })
        : null;

    const reasonInput: LodgingRecommendReasonInput = {
      peoplePlaceMatch,
      travelTrajectory,
      distanceKm,
      priceKrw: row.priceKrw ?? null,
    };

    const explained = explainLodgingRecommendationKo(reasonInput);
    const verifiedLine =
      verification.score100 >= 70 && !verifiedPool.usedRawFallback
        ? copy.globe.lodgingVerifiedEvidenceReason
        : null;
    const reasonKo =
      businessBias.reasons[0] ??
      titleReasons[0] ??
      (valueLeaning ? opportunity?.primaryLineKo : null) ??
      opportunity?.experienceLineKo ??
      verifiedLine ??
      explained.reasonKo;

    return {
      row,
      score,
      reasonKo,
      matchReasons: [
        ...businessBias.reasons,
        ...titleReasons,
        ...(verifiedLine ? [verifiedLine] : []),
        ...(opportunity?.lines ?? []),
        ...explained.matchReasons,
      ].slice(0, 3),
    };
  });

  scored.sort((left, right) => {
    const delta = right.score - left.score;
    if (delta !== 0) {
      return delta;
    }
    return left.row.name.localeCompare(right.row.name, "ko");
  });

  const diversified = diversifyScoredRecommendations(scored, {
    originLat: lat,
    originLng: lng,
    lambda: input.exploration?.mode === "diffuse" ? 0.5 : 0.62,
  });

  return diversified.map((entry, index) => {
    if (index === 0 && entry.matchReasons.length === 0) {
      const distanceKm =
        lat != null && lng != null
          ? haversineKm(lat, lng, entry.row.lat, entry.row.lng)
          : null;
      const explained = explainLodgingRecommendationKo({
        rankIndex: 0,
        distanceKm,
        priceKrw: entry.row.priceKrw ?? null,
      });
      return { ...entry, reasonKo: explained.reasonKo, matchReasons: explained.matchReasons };
    }
    return entry;
  });
}
