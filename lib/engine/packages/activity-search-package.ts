/**
 * Execution package — activity_search (놀거리 · 관광 · 명소).
 * Distinct from trip_experience_search (exploratory multi-leg trip fun).
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
import { readActivitySearchEngineState } from "@/lib/engine/read-engine-run-state";
import { isActivityPrepUtterance } from "@/lib/globe/activity-prep/is-activity-prep-utterance";
import {
  planOneShotActivityPrep,
  type OneShotActivityPrepPlan,
} from "@/lib/globe/activity-prep/plan-one-shot-activity-prep";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const ACTIVITY_SEARCH_ENGINE_GOAL = {
  id: "activity_search.find",
  goalKo: "놀거리·관광 등 체험 장소를 찾는다.",
} as const;

export const activitySearchEnginePackage: RimvioEnginePackage<OneShotActivityPrepPlan> =
  defineRimvioEnginePackage({
    id: "activity_search",
    executorId: "activity",
    containerKind: "travel",
    priority: 16,
    goal: ACTIVITY_SEARCH_ENGINE_GOAL,
    policy: DEFAULT_ENGINE_POLICY,
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "scout", labelKo: "놀거리 찾기" },
      { kind: "scout", id: "instant_activity_search", labelKo: "주변 놀거리 스카우트" },
      { kind: "capability", id: "NAVIGATE", labelKo: "길 안내" },
      { kind: "capability", id: "CONFIRM_PLACE", labelKo: "장소 확인" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "놀거리 찾기 완료",
      mainLabelKo: "놀거리 고정",
    }),
    memory: [
      {
        key: "contextConditionLastBatch",
        scope: "engine",
        labelKo: "활성 놀거리 배치",
      },
      {
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("activity_search")],
    executionNodeIds: resolveExecutionNodesForEngine("activity_search").map(
      (row) => row.nodeId,
    ),
    detect: isActivityPrepUtterance,
    readState: readActivitySearchEngineState,
    plan(input) {
      const domainPlan = planOneShotActivityPrep({ message: input.message });
      if (!domainPlan) {
        return null;
      }
      return {
        engineId: "activity_search",
        executorId: "activity",
        containerKind: "travel",
        goal: ACTIVITY_SEARCH_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForScout,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      if (plan.domainPlan.readyForScout) {
        return { tool: "scout", reason: "instant_activity_search" };
      }
      return null;
    },
  });
