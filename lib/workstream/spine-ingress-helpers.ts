/**
 * Ingress Router → Rimvio Agent Runtime (ADR-043 / ADR-045).
 * Legacy generations call this; it delegates to enterRimvioAgentRuntime only.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { AgentJudgmentChainResult } from "@/lib/workstream/agent-judgment-chain";
import type { IntentGoalState } from "@/lib/workstream/compile-intent-to-goal-state";
import {
  enterRimvioAgentRuntime,
  type RimvioAgentRuntimeTurn,
} from "@/lib/workstream/rimvio-agent-runtime";
import type {
  AgentSpineStage,
  SpineIngressRecord,
  SpineLegacyIngress,
} from "@/lib/workstream/agent-spine-law";

export type SpineIngressWithJudgment = SpineIngressRecord & {
  readonly intentGoal: IntentGoalState | null;
  readonly judgment: AgentJudgmentChainResult | null;
  readonly runtime: RimvioAgentRuntimeTurn;
};

/**
 * Every legacy path — action-chat · context-run · engine · workstream —
 * enters the **one** Agent Runtime through this router.
 */
export function spineIngressFromLegacy(input: {
  readonly source: SpineLegacyIngress;
  readonly contextEventId: string;
  readonly utterance?: string | null;
  readonly event?: EventCandidate | null;
  readonly stage?: AgentSpineStage;
  readonly syncGoal?: boolean;
  readonly runJudgment?: boolean;
}): SpineIngressWithJudgment {
  const runtime = enterRimvioAgentRuntime({
    source: input.source,
    contextEventId: input.contextEventId,
    utterance: input.utterance,
    event: input.event,
    stage: input.stage,
    syncGoal: input.syncGoal,
    runJudgment: input.runJudgment,
  });

  return {
    ...runtime.ingress,
    intentGoal: runtime.intentGoal,
    judgment: runtime.judgment,
    runtime,
  };
}
