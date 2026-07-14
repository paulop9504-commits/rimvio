/**
 * Cursor-style plan handoff — after a step advances, offer the next engine
 * as ask_chips (chips-first, not auto-scout).
 */

import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import { readActivePlanStep } from "@/lib/context-execution/read-active-plan-step";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

export type PlanStepHandoffChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: "plan_handoff";
  readonly value: string;
};

export type PlanStepHandoffOffer = {
  readonly engineId: RimvioEngineId;
  readonly stepId: string;
  readonly nodeId: string;
  readonly hintKo: string;
  readonly seedUtterance: string;
  readonly chips: readonly PlanStepHandoffChip[];
};

function buildHandoffForEngine(
  engineId: RimvioEngineId,
): Omit<PlanStepHandoffOffer, "stepId" | "nodeId" | "engineId"> | null {
  switch (engineId) {
    case "eatery_search":
      return {
        hintKo: "숙소가 준비됐어요 — 다음으로 맛집을 찾아볼까요?",
        seedUtterance: "주변 맛집 찾아줘",
        chips: [
          {
            id: "plan_handoff_eatery",
            labelKo: "주변 맛집",
            gapId: "plan_handoff",
            value: "주변 맛집 찾아줘",
          },
          {
            id: "plan_handoff_cafe",
            labelKo: "카페",
            gapId: "plan_handoff",
            value: "주변 카페 찾아줘",
          },
        ],
      };
    case "activity_search":
      return {
        hintKo: "다음으로 놀거리를 찾아볼까요?",
        seedUtterance: "주변 관광 찾아줘",
        chips: [
          {
            id: "plan_handoff_activity",
            labelKo: "놀거리",
            gapId: "plan_handoff",
            value: "주변 관광 찾아줘",
          },
        ],
      };
    case "local_amenity_search":
      return {
        hintKo: "편의시설이 필요하면 골라 주세요.",
        seedUtterance: "주변 편의점 찾아줘",
        chips: [
          {
            id: "plan_handoff_amenity",
            labelKo: "편의점",
            gapId: "plan_handoff",
            value: "주변 편의점 찾아줘",
          },
          {
            id: "plan_handoff_pharmacy",
            labelKo: "약국",
            gapId: "plan_handoff",
            value: "주변 약국 찾아줘",
          },
        ],
      };
    case "transit_navigate":
      return {
        hintKo: "이동을 준비할까요?",
        seedUtterance: "공항에서 호텔까지 길 알려줘",
        chips: [
          {
            id: "plan_handoff_transit",
            labelKo: "이동 경로",
            gapId: "plan_handoff",
            value: "공항에서 호텔까지 길 알려줘",
          },
        ],
      };
    case "finance_prep":
      return {
        hintKo: "결제·환전을 준비할까요?",
        seedUtterance: "환전 준비해줘",
        chips: [
          {
            id: "plan_handoff_finance",
            labelKo: "환전 준비",
            gapId: "plan_handoff",
            value: "환전 준비해줘",
          },
        ],
      };
    case "lodging_search":
      return {
        hintKo: "숙소를 이어서 찾아볼까요?",
        seedUtterance: "주변 호텔 찾아줘",
        chips: [
          {
            id: "plan_handoff_lodging",
            labelKo: "숙소 찾기",
            gapId: "plan_handoff",
            value: "주변 호텔 찾아줘",
          },
        ],
      };
    case "flight_booking":
      return {
        hintKo: "항공권을 준비할까요?",
        seedUtterance: "항공권 찾아줘",
        chips: [
          {
            id: "plan_handoff_flight",
            labelKo: "항공권",
            gapId: "plan_handoff",
            value: "항공권 찾아줘",
          },
        ],
      };
    default:
      return null;
  }
}

/** Pure — active running step with a known engine → chips-first handoff. */
export function resolvePlanStepHandoffOffer(
  plan: ContextExecutionPlanV1,
): PlanStepHandoffOffer | null {
  if (plan.osPhase !== "executing") {
    return null;
  }
  const step = readActivePlanStep(plan);
  if (!step || step.status !== "running" || !step.engineId) {
    return null;
  }
  const built = buildHandoffForEngine(step.engineId);
  if (!built) {
    return null;
  }
  return {
    engineId: step.engineId,
    stepId: step.stepId,
    nodeId: step.nodeId,
    ...built,
  };
}
