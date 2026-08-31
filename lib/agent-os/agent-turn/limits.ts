/**
 * Agent Turn safety limits — no infinite loops.
 */

import { AGENT_LOOP_LIMITS } from "@/lib/agent/loop/agent-state";
import { MAIN_AGENT_LOOP_LIMITS } from "@/lib/agent-os/main-agent-loop-phase";
import type { AgentTurnLimits } from "@/lib/agent-os/agent-turn/types";

export const AGENT_TURN_LIMITS: AgentTurnLimits = {
  maxSteps: AGENT_LOOP_LIMITS.MAX_STEPS,
  maxRetriesPerAction: AGENT_LOOP_LIMITS.MAX_SAME_ACTION,
  maxReplans: MAIN_AGENT_LOOP_LIMITS.MAX_REPLANS,
  executionTimeoutMs: 120_000,
};

export function limitReachedMessage(input: {
  readonly replanCount: number;
  readonly maxReplans: number;
}): string {
  return `자동으로 ${input.replanCount}번 수정/검증했지만 현재 환경에서는 이 문제를 해결하지 못했습니다.`;
}
