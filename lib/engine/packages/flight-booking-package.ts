import {
  DEFAULT_ENGINE_POLICY,
  defineRimvioEnginePackage,
  STANDARD_ENGINE_WORKFLOW,
  standardEngineEventBindings,
  type RimvioEnginePackage,
} from "@/lib/engine/engine-package";
import { resolveExecutionNodesForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import { readFlightBookingEngineState } from "@/lib/engine/read-engine-run-state";
import { isFlightPrepUtterance } from "@/lib/globe/flight-prep/is-flight-prep-utterance";
import {
  planOneShotFlightPrep,
  type OneShotFlightPrepPlan,
} from "@/lib/globe/flight-prep/plan-one-shot-flight-prep";
import { buildTripIntakeAskChips } from "@/lib/globe/trip-intake/build-trip-intake-ask-chips";
import {
  CONTEXT_TRIP_BUDGET_BAND_META_KEY,
  CONTEXT_TRIP_INTAKE_COMPLETE_META_KEY,
  CONTEXT_TRIP_ORIGIN_LABEL_META_KEY,
} from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const FLIGHT_BOOKING_ENGINE_GOAL = {
  id: "flight_booking.complete",
  goalKo: "항공권 예약을 준비하고 출발 허브를 연결한다.",
} as const;

export const flightBookingEnginePackage: RimvioEnginePackage<OneShotFlightPrepPlan> =
  defineRimvioEnginePackage({
    id: "flight_booking",
    executorId: "travel",
    containerKind: "travel",
    priority: 5,
    goal: FLIGHT_BOOKING_ENGINE_GOAL,
    policy: DEFAULT_ENGINE_POLICY,
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "ask_chips", labelKo: "조건 칩" },
      { kind: "operator", id: "scout", labelKo: "항공 찾기" },
      { kind: "scout", id: "instant_flight_search", labelKo: "출발 허브 스카우트" },
      { kind: "capability", id: "BOOK_FLIGHT", labelKo: "항공 예약" },
      { kind: "capability", id: "CHECK_IN", labelKo: "체크인" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "항공 찾기 완료",
      mainLabelKo: "항공 연결",
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
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("flight_booking")],
    executionNodeIds: resolveExecutionNodesForEngine("flight_booking").map(
      (row) => row.nodeId,
    ),
    detect: isFlightPrepUtterance,
    readState: readFlightBookingEngineState,
    plan(input) {
      const domainPlan = planOneShotFlightPrep({
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
        engineId: "flight_booking",
        executorId: "travel",
        containerKind: "travel",
        goal: FLIGHT_BOOKING_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForHub,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      const domain = plan.domainPlan;
      if (domain.intakeGaps.length > 0 && !domain.readyForHub) {
        const chips = buildTripIntakeAskChips(domain.intakeGaps);
        if (chips.length > 0) {
          return {
            tool: "ask_chips",
            reason: "trip_intake_gap",
            chips,
          };
        }
      }
      if (domain.readyForHub) {
        return { tool: "scout", reason: "instant_flight_search" };
      }
      return null;
    },
  });
