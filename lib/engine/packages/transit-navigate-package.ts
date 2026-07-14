import {
  DEFAULT_ENGINE_POLICY,
  defineRimvioEnginePackage,
  STANDARD_ENGINE_WORKFLOW,
  standardEngineEventBindings,
  type RimvioEnginePackage,
} from "@/lib/engine/engine-package";
import { resolveExecutionNodesForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import { readTransitNavigateEngineState } from "@/lib/engine/read-engine-run-state";
import { buildTransitPrepAskChips } from "@/lib/globe/transit-prep/build-transit-prep-ask-chips";
import { isTransitPrepUtterance } from "@/lib/globe/transit-prep/is-transit-prep-utterance";
import {
  planOneShotTransitPrep,
  type OneShotTransitPrepPlan,
} from "@/lib/globe/transit-prep/plan-one-shot-transit-prep";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const TRANSIT_NAVIGATE_ENGINE_GOAL = {
  id: "transit_navigate.move",
  goalKo: "이동 경로를 찾고 교통 수단을 준비한다.",
} as const;

export const transitNavigateEnginePackage: RimvioEnginePackage<OneShotTransitPrepPlan> =
  defineRimvioEnginePackage({
    id: "transit_navigate",
    executorId: "transit",
    containerKind: "travel",
    priority: 30,
    goal: TRANSIT_NAVIGATE_ENGINE_GOAL,
    policy: DEFAULT_ENGINE_POLICY,
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "ask_chips", labelKo: "경로 칩" },
      { kind: "operator", id: "scout", labelKo: "경로 찾기" },
      { kind: "scout", id: "instant_transit_navigate", labelKo: "이동 스카우트" },
      { kind: "capability", id: "NAVIGATE", labelKo: "길 안내" },
      { kind: "capability", id: "CONFIRM_PLACE", labelKo: "장소 확인" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "경로 찾기 완료",
      mainLabelKo: "이동 준비",
    }),
    memory: [
      {
        key: "contextTransitOriginLabel",
        scope: "engine",
        labelKo: "출발",
      },
      {
        key: "contextTransitDestinationLabel",
        scope: "engine",
        labelKo: "도착",
      },
      {
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("transit_navigate")],
    executionNodeIds: resolveExecutionNodesForEngine("transit_navigate").map(
      (row) => row.nodeId,
    ),
    detect: isTransitPrepUtterance,
    readState: readTransitNavigateEngineState,
    plan(input) {
      const domainPlan = planOneShotTransitPrep({
        message: input.message,
        event: input.event,
      });
      if (!domainPlan) {
        return null;
      }
      return {
        engineId: "transit_navigate",
        executorId: "transit",
        containerKind: "travel",
        goal: TRANSIT_NAVIGATE_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForNavigate,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      const domain = plan.domainPlan;
      if (domain.transitGaps.length > 0 && !domain.readyForNavigate) {
        const chips = buildTransitPrepAskChips(domain.transitGaps);
        if (chips.length > 0) {
          return {
            tool: "ask_chips",
            reason: "transit_prep_gap",
            chips,
          };
        }
      }
      if (domain.readyForNavigate) {
        return { tool: "scout", reason: "instant_transit_navigate" };
      }
      return null;
    },
  });
