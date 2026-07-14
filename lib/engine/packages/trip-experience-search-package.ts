import {
  DEFAULT_ENGINE_POLICY,
  defineRimvioEnginePackage,
  STANDARD_ENGINE_WORKFLOW,
  standardEngineEventBindings,
  type RimvioEnginePackage,
} from "@/lib/engine/engine-package";
import { resolveExecutionNodesForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import { readTripExperienceSearchEngineState } from "@/lib/engine/read-engine-run-state";
import { buildTripExperienceAskChips } from "@/lib/globe/trip-experience/build-trip-experience-ask-chips";
import { isTripExperienceUtterance } from "@/lib/globe/trip-experience/detect-trip-experience-utterance";
import {
  planOneShotTripExperiencePrep,
  type OneShotTripExperiencePrepPlan,
} from "@/lib/globe/trip-experience/plan-one-shot-trip-experience-prep";
import { CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY } from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const TRIP_EXPERIENCE_SEARCH_ENGINE_GOAL = {
  id: "trip_experience_search.discover",
  goalKo: "사용자가 원하는 재미·맥락에 맞는 여행 후보를 찾는다.",
} as const;

export const tripExperienceSearchEnginePackage: RimvioEnginePackage<OneShotTripExperiencePrepPlan> =
  defineRimvioEnginePackage({
    id: "trip_experience_search",
    executorId: "travel",
    containerKind: "travel",
    priority: 20,
    goal: TRIP_EXPERIENCE_SEARCH_ENGINE_GOAL,
    policy: DEFAULT_ENGINE_POLICY,
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "ask_chips", labelKo: "체험 칩" },
      { kind: "operator", id: "scout", labelKo: "병렬 찾기" },
      { kind: "scout", id: "trip_experience_parallel", labelKo: "체험 병렬 스카우트" },
      { kind: "capability", id: "NAVIGATE", labelKo: "길 안내" },
      { kind: "capability", id: "BOOK_HOTEL", labelKo: "숙소 예약" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "체험 찾기 완료",
      mainLabelKo: "체험 고정",
    }),
    memory: [
      {
        key: CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY,
        scope: "shared",
        labelKo: "여행 조건 완료",
      },
      {
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("trip_experience_search")],
    executionNodeIds: resolveExecutionNodesForEngine("trip_experience_search").map(
      (row) => row.nodeId,
    ),
    detect: isTripExperienceUtterance,
    readState: readTripExperienceSearchEngineState,
    plan(input) {
      const domainPlan = planOneShotTripExperiencePrep({
        message: input.message,
        event: input.event,
        userLat: input.userLat,
        userLng: input.userLng,
        now: input.now,
      });
      if (!domainPlan) {
        return null;
      }
      return {
        engineId: "trip_experience_search",
        executorId: "travel",
        containerKind: "travel",
        goal: TRIP_EXPERIENCE_SEARCH_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForScout,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      const domain = plan.domainPlan;
      if (domain.experienceGaps.length > 0 && !domain.readyForScout) {
        const chips = buildTripExperienceAskChips(domain.experienceGaps);
        if (chips.length > 0) {
          return {
            tool: "ask_chips",
            reason: "trip_experience_gap",
            chips,
          };
        }
      }
      if (domain.readyForScout) {
        return { tool: "scout", reason: "trip_experience_parallel" };
      }
      return null;
    },
  });
