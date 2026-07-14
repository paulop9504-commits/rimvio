import {
  DEFAULT_ENGINE_POLICY,
  defineRimvioEnginePackage,
  STANDARD_ENGINE_WORKFLOW,
  standardEngineEventBindings,
  type RimvioEnginePackage,
} from "@/lib/engine/engine-package";
import { resolveExecutionNodesForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import { readFinancePrepEngineState } from "@/lib/engine/read-engine-run-state";
import { buildFinancePrepAskChips } from "@/lib/globe/finance-prep/build-finance-prep-ask-chips";
import { isFinancePrepUtterance } from "@/lib/globe/finance-prep/is-finance-prep-utterance";
import {
  planOneShotFinancePrep,
  type OneShotFinancePrepPlan,
} from "@/lib/globe/finance-prep/plan-one-shot-finance-prep";
import { CONTEXT_TRIP_BUDGET_BAND_META_KEY } from "@/lib/globe/trip-intake/trip-intake-metadata-keys";
import { CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY } from "@/lib/globe/context-pinned-item";
import { resolveEngineCapabilityIds } from "@/lib/marketplace/engine-market-registry";

export const FINANCE_PREP_ENGINE_GOAL = {
  id: "finance_prep.prepare",
  goalKo: "결제·환전·예산 정책을 준비한다.",
} as const;

export const financePrepEnginePackage: RimvioEnginePackage<OneShotFinancePrepPlan> =
  defineRimvioEnginePackage({
    id: "finance_prep",
    executorId: "finance",
    containerKind: "finance",
    priority: 35,
    goal: FINANCE_PREP_ENGINE_GOAL,
    policy: {
      ...DEFAULT_ENGINE_POLICY,
      expressSlotFill: true,
    },
    workflow: STANDARD_ENGINE_WORKFLOW,
    tools: [
      { kind: "operator", id: "ask_chips", labelKo: "예산 칩" },
      { kind: "operator", id: "scout", labelKo: "결제 준비" },
      { kind: "scout", id: "instant_finance_payment", labelKo: "결제 prep 스카우트" },
      { kind: "capability", id: "BOOK_HOTEL", labelKo: "숙소 결제" },
    ],
    events: standardEngineEventBindings({
      scoutLabelKo: "예산 맞춤",
      mainLabelKo: "결제 준비",
    }),
    memory: [
      {
        key: CONTEXT_TRIP_BUDGET_BAND_META_KEY,
        scope: "engine",
        labelKo: "예산 밴드",
      },
      {
        key: CONTEXT_LODGING_PINNED_PLACE_ID_META_KEY,
        scope: "shared",
        labelKo: "결제 대상 숙소",
      },
      {
        key: "contextEngineEventsV1",
        scope: "shared",
        labelKo: "엔진 이벤트",
      },
    ],
    capabilities: [...resolveEngineCapabilityIds("finance_prep")],
    executionNodeIds: resolveExecutionNodesForEngine("finance_prep").map(
      (row) => row.nodeId,
    ),
    detect: isFinancePrepUtterance,
    readState: readFinancePrepEngineState,
    plan(input) {
      const domainPlan = planOneShotFinancePrep({
        message: input.message,
        event: input.event,
      });
      if (!domainPlan) {
        return null;
      }
      return {
        engineId: "finance_prep",
        executorId: "finance",
        containerKind: "finance",
        goal: FINANCE_PREP_ENGINE_GOAL,
        message: domainPlan.message,
        readyForScout: domainPlan.readyForPayment,
        steps: domainPlan.steps,
        domainPlan,
      };
    },
    toOperatorPlan(plan) {
      const domain = plan.domainPlan;
      if (domain.financeGaps.length > 0 && !domain.readyForPayment) {
        const chips = buildFinancePrepAskChips(domain.financeGaps);
        if (chips.length > 0) {
          return {
            tool: "ask_chips",
            reason: "finance_prep_gap",
            chips,
          };
        }
      }
      if (domain.readyForPayment) {
        return { tool: "scout", reason: "instant_finance_payment" };
      }
      return null;
    },
  });
