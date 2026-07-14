/**
 * Execution package — eatery_search (restaurant · cafe · cuisine).
 * Distinct from trip_experience_search (exploratory trip fun).
 * @see docs/RIMVIO_ENGINE.md
 */

import {
  DEFAULT_ENGINE_POLICY,
  defineRimvioEnginePackage,
  STANDARD_ENGINE_WORKFLOW,
  standardEngineEventBindings,
  type RimvioEnginePackage,
} from "@/lib/engine/engine-package";
import { resolveExecutionNodesForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import { readEaterySearchEngineState } from "@/lib/engine/read-engine-run-state";
import { isEateryPrepUtterance } from "@/lib/globe/eatery-prep/is-eatery-prep-utterance";
import {
  planOneShotEateryPrep,
  type OneShotEateryPrepPlan,
} from "@/lib/globe/eatery-prep/plan-one-shot-eatery-prep";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const EATERY_SEARCH_ENGINE_GOAL = {
  id: "eatery_search.find",
  goalKo: "맛집·카페 등 식사 장소를 찾는다.",
} as const;

export const eaterySearchEnginePackage: RimvioEnginePackage<OneShotEateryPrepPlan> =
  defineRimvioEnginePackage({
    id: "eatery_search",
    executorId: "eatery",
    containerKind: "travel",
    priority: 14,
    goal: EATERY_SEARCH_ENGINE_GOAL,
    policy: DEFAULT_ENGINE_POLICY,
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "scout", labelKo: "맛집 찾기" },
      { kind: "scout", id: "instant_eatery_search", labelKo: "주변 맛집 스카우트" },
      { kind: "capability", id: "NAVIGATE", labelKo: "길 안내" },
      { kind: "capability", id: "CONFIRM_PLACE", labelKo: "장소 확인" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "맛집 찾기 완료",
      mainLabelKo: "맛집 고정",
    }),
    memory: [
      {
        key: "contextConditionLastBatch",
        scope: "engine",
        labelKo: "활성 맛집 배치",
      },
      {
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("eatery_search")],
    executionNodeIds: resolveExecutionNodesForEngine("eatery_search").map(
      (row) => row.nodeId,
    ),
    detect: isEateryPrepUtterance,
    readState: readEaterySearchEngineState,
    plan(input) {
      const domainPlan = planOneShotEateryPrep({ message: input.message });
      if (!domainPlan) {
        return null;
      }
      return {
        engineId: "eatery_search",
        executorId: "eatery",
        containerKind: "travel",
        goal: EATERY_SEARCH_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForScout,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      if (plan.domainPlan.readyForScout) {
        return { tool: "scout", reason: "instant_eatery_search" };
      }
      return null;
    },
  });
