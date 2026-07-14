/**
 * Reference execution package — lodging_search.
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
import { readLodgingSearchEngineState } from "@/lib/engine/read-engine-run-state";
import { isLodgingPrepUtterance } from "@/lib/globe/lodging-prep/is-lodging-prep-utterance";
import {
  planOneShotLodgingPrep,
  type OneShotLodgingPrepPlan,
} from "@/lib/globe/lodging-prep/plan-one-shot-lodging-prep";
import { buildTripIntakeAskChips } from "@/lib/globe/trip-intake/build-trip-intake-ask-chips";
import {
  CONTEXT_TRIP_BUDGET_BAND_META_KEY,
  CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY,
  CONTEXT_TRIP_ORIGIN_LABEL_META_KEY,
} from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import { CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY } from "@/lib/globe/context-pinned-item";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const LODGING_SEARCH_ENGINE_GOAL = {
  id: "lodging_search.complete",
  goalKo: "사용자가 원하는 숙소를 찾고 예약을 준비한다.",
} as const;

export const lodgingSearchEnginePackage: RimvioEnginePackage<OneShotLodgingPrepPlan> =
  defineRimvioEnginePackage({
    id: "lodging_search",
    executorId: "lodging",
    containerKind: "travel",
    priority: 10,
    goal: LODGING_SEARCH_ENGINE_GOAL,
    policy: {
      ...DEFAULT_ENGINE_POLICY,
      expressSlotFill: true,
    },
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "ask_chips", labelKo: "조건 칩" },
      { kind: "operator", id: "scout", labelKo: "숙소 찾기" },
      { kind: "scout", id: "instant_lodging_search", labelKo: "주변 숙소 스카우트" },
      { kind: "capability", id: "BOOK_HOTEL", labelKo: "숙소 예약" },
      { kind: "capability", id: "NAVIGATE", labelKo: "길 안내" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "숙소 찾기 완료",
      mainLabelKo: "숙소 고정",
    }),
    memory: [
      {
        key: CONTEXT_TRIP_ORIGIN_LABEL_META_KEY,
        scope: "shared",
        labelKo: "출발지",
      },
      {
        key: CONTEXT_TRIP_BUDGET_BAND_META_KEY,
        scope: "shared",
        labelKo: "예산 밴드",
      },
      {
        key: CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY,
        scope: "shared",
        labelKo: "여행 조건 완료",
      },
      {
        key: CONTEXT_LODGING_PINNED_RESOURCE_ID_META_KEY,
        scope: "engine",
        labelKo: "고정 숙소",
      },
      {
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("lodging_search")],
    executionNodeIds: resolveExecutionNodesForEngine("lodging_search").map(
      (row) => row.nodeId,
    ),
    detect: isLodgingPrepUtterance,
    readState: readLodgingSearchEngineState,
    plan(input) {
      const domainPlan = planOneShotLodgingPrep({
        message: input.message,
        event: input.event,
        userLat: input.userLat,
        userLng: input.userLng,
        now: input.now,
        expressReady: input.expressReady,
      });
      if (!domainPlan) {
        return null;
      }
      return {
        engineId: "lodging_search",
        executorId: "lodging",
        containerKind: "travel",
        goal: LODGING_SEARCH_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForScout,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      const domain = plan.domainPlan;
      if (domain.readyForScout) {
        return { tool: "scout", reason: "instant_lodging_search" };
      }
      if (domain.intakeGaps.length > 0) {
        // Soft gaps (budget · origin · guests) do not block scout when express-ready.
        const hardGaps = domain.intakeGaps.filter(
          (gap) => gap === "destination" || gap === "dates",
        );
        const chips = buildTripIntakeAskChips(
          hardGaps.length > 0 ? hardGaps : domain.intakeGaps,
        );
        if (chips.length > 0) {
          return {
            tool: "ask_chips",
            reason: "trip_intake_gap",
            chips,
          };
        }
      }
      return null;
    },
  });
