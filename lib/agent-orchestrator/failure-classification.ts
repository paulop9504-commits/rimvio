/**
 * Failure classification + policy routing (P7).
 */

import type { AgentObservation } from "@/lib/agent/types";
import type { ToolInvokeResult } from "@/lib/tool-registry";

export type AgentFailureClass =
  | "transient"
  | "empty_result"
  | "invalid_input"
  | "constraint_conflict"
  | "tool_failure"
  | "permission_required"
  | "human_commit_required"
  | "irrecoverable";

export type FailurePolicyAction =
  | "retry"
  | "alternative_search"
  | "replan"
  | "relax_constraint"
  | "ask_user"
  | "commit_gate"
  | "explain_failure";

export function classifyAgentFailure(input: {
  readonly observation: AgentObservation;
  readonly tool?: ToolInvokeResult | null;
}): AgentFailureClass {
  const errors = input.observation.errors ?? [];
  const stepKind = input.observation.stepKind;

  if (stepKind === "wait_commit" || errors.includes("human_commit_required")) {
    return "human_commit_required";
  }
  if (errors.includes("permission_required")) {
    return "permission_required";
  }
  if (errors.includes("empty_candidates") || errors.includes("empty_or_failed")) {
    return "empty_result";
  }
  if (errors.includes("constraint_conflict")) {
    return "constraint_conflict";
  }
  if (errors.includes("invalid_input")) {
    return "invalid_input";
  }
  if (input.tool && !input.tool.ok) {
    if (/timeout|rate|503|502|429/i.test(input.tool.summaryKo ?? "")) {
      return "transient";
    }
    return "tool_failure";
  }
  if (!input.observation.success && input.observation.stepKind === "resolve_entity") {
    return "empty_result";
  }
  if (!input.observation.success) {
    return "tool_failure";
  }
  return "irrecoverable";
}

export function policyForFailure(failure: AgentFailureClass): FailurePolicyAction {
  switch (failure) {
    case "transient":
      return "retry";
    case "empty_result":
      return "alternative_search";
    case "constraint_conflict":
      return "replan";
    case "invalid_input":
      return "ask_user";
    case "permission_required":
      return "ask_user";
    case "human_commit_required":
      return "commit_gate";
    case "tool_failure":
      return "retry";
    case "irrecoverable":
      return "explain_failure";
  }
}
