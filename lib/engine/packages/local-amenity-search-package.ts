/**
 * Execution package — local_amenity_search (pharmacy · convenience · ATM …).
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
import { readLocalAmenitySearchEngineState } from "@/lib/engine/read-engine-run-state";
import { isAmenityPrepUtterance } from "@/lib/globe/amenity-prep/is-amenity-prep-utterance";
import {
  planOneShotAmenityPrep,
  type OneShotAmenityPrepPlan,
} from "@/lib/globe/amenity-prep/plan-one-shot-amenity-prep";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const LOCAL_AMENITY_SEARCH_ENGINE_GOAL = {
  id: "local_amenity_search.find",
  goalKo: "약국·편의점 등 생활 편의 장소를 찾는다.",
} as const;

export const localAmenitySearchEnginePackage: RimvioEnginePackage<OneShotAmenityPrepPlan> =
  defineRimvioEnginePackage({
    id: "local_amenity_search",
    executorId: "amenity",
    containerKind: "travel",
    priority: 12,
    goal: LOCAL_AMENITY_SEARCH_ENGINE_GOAL,
    policy: DEFAULT_ENGINE_POLICY,
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "scout", labelKo: "편의 찾기" },
      { kind: "scout", id: "instant_poi_search", labelKo: "주변 편의 스카우트" },
      { kind: "capability", id: "NAVIGATE", labelKo: "길 안내" },
      { kind: "capability", id: "CONFIRM_PLACE", labelKo: "장소 확인" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "편의 찾기 완료",
      mainLabelKo: "편의 고정",
    }),
    memory: [
      {
        key: "contextConditionLastBatch",
        scope: "engine",
        labelKo: "활성 편의 배치",
      },
      {
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("local_amenity_search")],
    executionNodeIds: resolveExecutionNodesForEngine("local_amenity_search").map(
      (row) => row.nodeId,
    ),
    detect: isAmenityPrepUtterance,
    readState: readLocalAmenitySearchEngineState,
    plan(input) {
      const domainPlan = planOneShotAmenityPrep({ message: input.message });
      if (!domainPlan) {
        return null;
      }
      return {
        engineId: "local_amenity_search",
        executorId: "amenity",
        containerKind: "travel",
        goal: LOCAL_AMENITY_SEARCH_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForScout,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      if (plan.domainPlan.readyForScout) {
        return { tool: "scout", reason: "instant_poi_search" };
      }
      return null;
    },
  });
