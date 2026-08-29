/**
 * Hub Agent Loop ↔ enterRimvioAgentRuntime convergence (ADR-045).
 * Hub uses workstream ingress with hub-scoped contextEventId — no parallel runtime.
 */

import {
  enterRimvioAgentRuntime,
  type RimvioAgentRuntimeTurn,
} from "@/lib/workstream/rimvio-agent-runtime";
import type { AgentStrategyId } from "@/lib/workstream/agent-judgment-chain";

export type HubAgentRuntimeContext = {
  readonly turn: RimvioAgentRuntimeTurn;
  readonly contextEventId: string;
  readonly strategy: AgentStrategyId;
  readonly goalKo: string | null;
};

export function hubContextEventId(platformId: string): string {
  return `hub:workspace:${platformId.trim() || "dev"}`;
}

/**
 * Enter ADR-045 runtime before Hub Observe→Plan→Execute loop.
 */
export function enterHubAgentRuntimeTurn(input: {
  readonly utterance: string;
  readonly platformId: string;
}): HubAgentRuntimeContext {
  const contextEventId = hubContextEventId(input.platformId);
  const turn = enterRimvioAgentRuntime({
    source: "workstream",
    contextEventId,
    utterance: input.utterance,
    runJudgment: true,
    syncGoal: true,
    readMemory: false,
  });

  const strategy = turn.judgment?.strategy.strategy ?? "planning";
  const goalKo = turn.intentGoal?.goalKo ?? null;

  return { turn, contextEventId, strategy, goalKo };
}
