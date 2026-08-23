/**
 * Rimvio Agent Runtime — the one runtime (ADR-045 / ADR-046).
 *
 * Observer → Supervisor → Judge → Planner → Coordinator → Executor
 * → Verifier → Repairer → Committer → Historian(+Reflection)
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  capabilitiesForScopeDomains,
  type AgentCapabilityId,
} from "@/lib/workstream/agent-capability-registry";
import {
  readAgentHealthSnapshot,
  type AgentHealthSnapshot,
} from "@/lib/workstream/agent-health";
import {
  runAgentJudgmentChain,
  type AgentJudgmentChainResult,
} from "@/lib/workstream/agent-judgment-chain";
import {
  readAgentMemory,
  type AgentMemory,
} from "@/lib/workstream/agent-memory";
import { ensureAgentExecutionStateManager } from "@/lib/workstream/agent-execution-state-manager";
import { publishAgentRuntimeEvent } from "@/lib/workstream/agent-runtime-bus";
import { dispatchBackgroundAgentVerification } from "@/lib/workstream/run-background-agent-verification";
import {
  summarizeAgentRuntimeMetrics,
  timeAgentRuntimeStep,
  type AgentRuntimeMetricsSummary,
} from "@/lib/workstream/agent-runtime-metrics";
import {
  RIMVIO_AGENT_RUNTIME_LOOP,
  RIMVIO_AGENT_RUNTIME_SLOGAN,
  RIMVIO_AGENT_RUNTIME_STAGES,
  type RimvioAgentRuntimeStage,
} from "@/lib/workstream/agent-runtime-stages";
import {
  enterAgentSpine,
  type AgentSpineStage,
  type SpineIngressRecord,
  type SpineLegacyIngress,
} from "@/lib/workstream/agent-spine-law";
import {
  compileIntentToGoalState,
  type IntentGoalState,
} from "@/lib/workstream/compile-intent-to-goal-state";
import { readAgentBrainSnapshot } from "@/lib/workstream/agent-brain";
import type { AgentBrainSnapshot } from "@/lib/workstream/agent-brain";
import { observeWorldState, type WorldState } from "@/lib/workstream/world-state";
import {
  detectOpportunities,
  type DetectedOpportunity,
} from "@/lib/workstream/opportunity-detector";
import {
  superviseGoal,
  type GoalSupervisorReport,
} from "@/lib/workstream/goal-supervisor";

export type RimvioAgentRuntimeTurn = {
  readonly slogan: typeof RIMVIO_AGENT_RUNTIME_SLOGAN;
  readonly stages: typeof RIMVIO_AGENT_RUNTIME_STAGES;
  readonly loop: typeof RIMVIO_AGENT_RUNTIME_LOOP;
  readonly ingress: SpineIngressRecord;
  readonly intentGoal: IntentGoalState | null;
  readonly judgment: AgentJudgmentChainResult | null;
  readonly capabilities: readonly AgentCapabilityId[];
  readonly world: WorldState | null;
  readonly opportunities: readonly DetectedOpportunity[];
  readonly supervisor: GoalSupervisorReport | null;
  readonly memory: AgentMemory | null;
  readonly brain: AgentBrainSnapshot | null;
  readonly health: AgentHealthSnapshot;
  readonly metrics: AgentRuntimeMetricsSummary;
  readonly activeStage: RimvioAgentRuntimeStage;
};

let lastTurn: RimvioAgentRuntimeTurn | null = null;

/**
 * Single ingress for every user request path.
 */
export function enterRimvioAgentRuntime(input: {
  readonly source: SpineLegacyIngress;
  readonly contextEventId: string;
  readonly utterance?: string | null;
  readonly event?: EventCandidate | null;
  readonly stage?: AgentSpineStage;
  readonly syncGoal?: boolean;
  readonly runJudgment?: boolean;
  readonly readMemory?: boolean;
}): RimvioAgentRuntimeTurn {
  const contextEventId =
    input.contextEventId.trim() || `runtime:${input.source}`;
  const utterance = input.utterance?.trim() || null;

  ensureAgentExecutionStateManager();

  publishAgentRuntimeEvent({
    kind: "intent_received",
    contextEventId,
    labelKo: utterance ? `Intent: ${utterance.slice(0, 40)}` : "Intent",
    payload: { source: input.source },
  });

  const ingress = timeAgentRuntimeStep({
    kind: "observe",
    contextEventId,
    labelKo: "Observer · Spine ingress",
    run: () =>
      enterAgentSpine({
        source: input.source,
        contextEventId,
        utterance,
        stage: input.stage ?? "goal_state",
      }),
  });

  let intentGoal: IntentGoalState | null = null;
  if (input.syncGoal !== false && utterance) {
    intentGoal = timeAgentRuntimeStep({
      kind: "plan",
      contextEventId,
      labelKo: "Goal State sync",
      run: () =>
        compileIntentToGoalState({
          utterance,
          contextEventId,
          event: input.event,
        }),
    });
    publishAgentRuntimeEvent({
      kind: "goal_synced",
      contextEventId,
      labelKo: intentGoal.goalKo,
    });
  }

  const world = timeAgentRuntimeStep({
    kind: "observe",
    contextEventId,
    labelKo: "Observer · World State",
    run: () =>
      observeWorldState({
        contextEventId,
        destinationHint:
          intentGoal?.entities[0] ??
          (typeof input.event?.place === "string" ? input.event.place : null),
        utterance,
      }),
  });
  publishAgentRuntimeEvent({
    kind: "world_observed",
    contextEventId,
    labelKo: `World · ${world.signals.length} signals`,
  });

  const opportunities = detectOpportunities({
    contextEventId,
    world,
  });
  if (opportunities.length > 0) {
    publishAgentRuntimeEvent({
      kind: "opportunity_detected",
      contextEventId,
      labelKo: opportunities[0]!.titleKo,
      payload: { count: opportunities.length },
    });
  }

  const supervisor = timeAgentRuntimeStep({
    kind: "plan",
    contextEventId,
    labelKo: "Goal Supervisor",
    run: () =>
      superviseGoal({
        contextEventId,
        event: input.event,
        opportunities,
      }),
  });
  publishAgentRuntimeEvent({
    kind: "goal_supervised",
    contextEventId,
    labelKo: `${supervisor.percent}% · ${supervisor.nextToRaiseKo}`,
  });

  let judgment: AgentJudgmentChainResult | null = null;
  if (input.runJudgment !== false && utterance) {
    judgment = timeAgentRuntimeStep({
      kind: "judge",
      contextEventId,
      labelKo: "Judge · Judgment Chain",
      run: () =>
        runAgentJudgmentChain({
          utterance,
          intentGoal,
        }),
    });
    publishAgentRuntimeEvent({
      kind: "judgment_ready",
      contextEventId,
      labelKo: judgment.strategy.labelKo,
      payload: {
        strategy: judgment.strategy.strategy,
        confidence: judgment.cost.confidence.score01,
      },
    });
    publishAgentRuntimeEvent({
      kind: "strategy_selected",
      contextEventId,
      labelKo: judgment.strategy.labelKo,
    });

    if (judgment.strategy.runVerificationLoop) {
      dispatchBackgroundAgentVerification({
        contextEventId,
        event: input.event ?? null,
        strategy:
          judgment.strategy.strategy === "recovery" ? "recovery" : "schedule",
      });
    }
  }

  const capabilities = judgment
    ? capabilitiesForScopeDomains(judgment.cost.scope.domains)
    : capabilitiesForScopeDomains(["context_graph", "search"]);

  // Execute: Planning trip → fill focused map Workspace (Osaka 4박5일 shape).
  if (
    typeof window !== "undefined" &&
    utterance &&
    (judgment?.strategy.strategy === "planning" ||
      judgment?.strategy.strategy === "multi")
  ) {
    void import("@/lib/agent/open-workspace-for-trip-prep").then(
      ({ openWorkspaceForTripPrep }) => {
        openWorkspaceForTripPrep({
          utterance,
          contextEventId,
        });
      },
    );
  }

  const memory =
    input.readMemory === false
      ? null
      : timeAgentRuntimeStep({
          kind: "observe",
          contextEventId,
          labelKo: "Historian · Agent Memory",
          run: () =>
            readAgentMemory({
              contextEventId,
              event: input.event,
            }),
        });

  const brain = readAgentBrainSnapshot({
    contextEventId,
    event: input.event,
    utterance,
  });

  const health = readAgentHealthSnapshot();
  const metrics = summarizeAgentRuntimeMetrics(contextEventId);

  const activeStage: RimvioAgentRuntimeStage =
    judgment?.strategy.strategy === "execution"
      ? "executor"
      : judgment?.strategy.strategy === "recovery"
        ? "repairer"
        : opportunities.length > 0 && !supervisor.isComplete
          ? "coordinator"
          : judgment?.strategy.runVerificationLoop
            ? "verifier"
            : judgment?.strategy.skipFullPlanner
              ? "executor"
              : "supervisor";

  const turn: RimvioAgentRuntimeTurn = {
    slogan: RIMVIO_AGENT_RUNTIME_SLOGAN,
    stages: RIMVIO_AGENT_RUNTIME_STAGES,
    loop: RIMVIO_AGENT_RUNTIME_LOOP,
    ingress,
    intentGoal,
    judgment,
    capabilities,
    world,
    opportunities,
    supervisor,
    memory,
    brain,
    health,
    metrics,
    activeStage,
  };
  lastTurn = turn;

  publishAgentRuntimeEvent({
    kind: "ui_invalidate",
    contextEventId,
    labelKo: "UI refresh",
  });

  return turn;
}

export function readLastRimvioAgentRuntimeTurn(): RimvioAgentRuntimeTurn | null {
  return lastTurn;
}

export function clearLastRimvioAgentRuntimeTurnForTests(): void {
  lastTurn = null;
}
