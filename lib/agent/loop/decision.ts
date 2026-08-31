/**
 * Agent Loop — Observe / Decide / Verify helpers.
 */

import type { AgentIntent } from "@/lib/agent/intent/intent-types";
import type { AgentState } from "@/lib/agent/loop/agent-state";
import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";

export type AgentDecision =
  | { readonly type: "observe_only"; readonly reason: string }
  | { readonly type: "plan_and_execute"; readonly reason: string }
  | { readonly type: "run_tests"; readonly reason: string }
  | { readonly type: "connect"; readonly reason: string }
  | { readonly type: "publish"; readonly reason: string }
  | { readonly type: "replan"; readonly reason: string; readonly steps: readonly HubAgentPlanStep[] }
  | { readonly type: "stop"; readonly reason: string; readonly ok: boolean };

export function decideNextStep(state: AgentState, lastVerifyOk: boolean | null): AgentDecision {
  if (state.intent === "inspect") {
    return { type: "observe_only", reason: "inspect_intent" };
  }
  if (state.intent === "test") {
    return { type: "run_tests", reason: "test_intent" };
  }
  if (state.intent === "connect") {
    return { type: "connect", reason: "connect_intent" };
  }
  if (state.intent === "publish") {
    return { type: "publish", reason: "publish_intent" };
  }
  if (lastVerifyOk === false && state.replanCount < 5) {
    return {
      type: "replan",
      reason: "verification_failed",
      steps: [
        { id: "fix", label: "실패 수정", toolId: "schema.update", args: { capability: "payment.commit", fixApprovalToken: true } },
        { id: "retest", label: "테스트 재실행", toolId: "test.run" },
      ],
    };
  }
  return { type: "plan_and_execute", reason: `${state.intent}_intent` };
}

export function intentToInitialPhase(intent: AgentIntent): "observe" | "execute" {
  return intent === "inspect" ? "observe" : "execute";
}
