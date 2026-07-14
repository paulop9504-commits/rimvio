/**
 * Pure — after Plan step advances, decide auto-scout vs chips-first handoff.
 * System sequencer Act (post-approval) — not user-turn ReAct.
 */

import { resolvePlanStepHandoffOffer } from "@/lib/context-execution/build-plan-step-handoff";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import { getRimvioEnginePackageById } from "@/lib/engine/engine-registry";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type PlanStepAutoAdvanceDecision =
  | {
      readonly kind: "auto_scout";
      readonly engineId: RimvioEngineId;
      readonly seedUtterance: string;
      readonly progressKo: string;
    }
  | {
      readonly kind: "chips";
      readonly engineId: RimvioEngineId;
      readonly seedUtterance: string;
    }
  | { readonly kind: "none" };

/** Domain scouts that should run without another chip wall when possible. */
const SOFT_AUTO_SCOUT_ENGINES = new Set<RimvioEngineId>([
  "eatery_search",
  "activity_search",
  "local_amenity_search",
  "trip_experience_search",
  /** Stay-step lodging — after human destination+departure, skip second chip tap. */
  "lodging_search",
]);

function progressLineForEngine(engineId: RimvioEngineId): string {
  switch (engineId) {
    case "lodging_search":
      return "숙소 후보를 맞추는 중이에요…";
    case "eatery_search":
      return "맛집 후보를 맞추는 중이에요…";
    case "activity_search":
      return "놀거리 후보를 맞추는 중이에요…";
    case "local_amenity_search":
      return "근처 편의시설을 맞추는 중이에요…";
    case "trip_experience_search":
      return "숙소·맛집·놀거리를 같이 맞추는 중이에요…";
    case "flight_booking":
      return "항공 조건을 맞추는 중이에요…";
    case "transit_navigate":
      return "이동 경로를 준비하는 중이에요…";
    case "finance_prep":
      return "결제·환전 준비를 여는 중이에요…";
    default:
      return "다음 단계를 준비하는 중이에요…";
  }
}

/**
 * Decision: fire scheduled engine scout immediately, or fall back to chips.
 * Uses package.plan + toOperatorPlan with expressReady soft-fill.
 */
export function resolvePlanStepAutoAdvance(input: {
  plan: ContextExecutionPlanV1;
  event?: EventCandidate | null;
  userLat?: number | null;
  userLng?: number | null;
}): PlanStepAutoAdvanceDecision {
  const offer = resolvePlanStepHandoffOffer(input.plan);
  if (!offer) {
    return { kind: "none" };
  }

  const progressKo = progressLineForEngine(offer.engineId);
  const pkg = getRimvioEnginePackageById(offer.engineId);

  if (!pkg) {
    return {
      kind: "chips",
      engineId: offer.engineId,
      seedUtterance: offer.seedUtterance,
    };
  }

  const enginePlan = pkg.plan({
    message: offer.seedUtterance,
    event: input.event ?? null,
    userLat: input.userLat,
    userLng: input.userLng,
    expressReady: true,
  });

  if (!enginePlan) {
    if (SOFT_AUTO_SCOUT_ENGINES.has(offer.engineId)) {
      return {
        kind: "auto_scout",
        engineId: offer.engineId,
        seedUtterance: offer.seedUtterance,
        progressKo,
      };
    }
    return {
      kind: "chips",
      engineId: offer.engineId,
      seedUtterance: offer.seedUtterance,
    };
  }

  const operator = pkg.toOperatorPlan(enginePlan);
  if (operator?.tool === "scout") {
    return {
      kind: "auto_scout",
      engineId: offer.engineId,
      seedUtterance: offer.seedUtterance,
      progressKo,
    };
  }

  if (SOFT_AUTO_SCOUT_ENGINES.has(offer.engineId)) {
    return {
      kind: "auto_scout",
      engineId: offer.engineId,
      seedUtterance: offer.seedUtterance,
      progressKo,
    };
  }

  return {
    kind: "chips",
    engineId: offer.engineId,
    seedUtterance: offer.seedUtterance,
  };
}
