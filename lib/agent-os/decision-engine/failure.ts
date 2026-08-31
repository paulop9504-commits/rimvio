/**
 * Failure classification — wraps orchestrator classifyAgentFailure + Hub errors.
 */

import { classifyAgentFailure } from "@/lib/agent-orchestrator/failure-classification";
import type { AgentObservation } from "@/lib/agent/types";
import type { DecisionFailureType } from "@/lib/agent-os/decision-engine/types";

export function classifyDecisionFailure(input: {
  readonly summary?: string | null;
  readonly errors?: readonly string[];
  readonly observation?: AgentObservation | null;
  readonly missingDependency?: boolean;
  readonly capabilityMissing?: boolean;
}): DecisionFailureType {
  if (input.missingDependency) return "dependency";
  if (input.capabilityMissing) return "capability";

  const text = `${input.summary ?? ""} ${(input.errors ?? []).join(" ")}`.toLowerCase();
  if (/timeout|network|503|502|429/.test(text)) return "transient";
  if (/permission|unauthorized|403/.test(text)) return "permission";
  if (/config|env|missing key/.test(text)) return "configuration";
  if (/compatib|호환|architecture|adapter/.test(text)) return "capability";
  if (/mutation|logic|incorrect|호출되지/.test(text)) return "logic";
  if (/ambiguous|어느|선택/.test(text)) return "user_input";
  if (/impossible|unrecoverable|환경/.test(text)) return "unrecoverable";

  if (input.observation) {
    const legacy = classifyAgentFailure({ observation: input.observation });
    switch (legacy) {
      case "transient":
        return "transient";
      case "permission_required":
      case "human_commit_required":
        return "permission";
      case "invalid_input":
        return "user_input";
      case "empty_result":
        return "state";
      case "constraint_conflict":
        return "logic";
      case "tool_failure":
        return "retryable";
      default:
        return "unrecoverable";
    }
  }

  if (input.errors?.length) return "retryable";
  return "unrecoverable";
}

export function actionForFailure(type: DecisionFailureType): "RETRY" | "REPLAN" | "ASK_USER" | "ABORT" | "ACT" {
  switch (type) {
    case "transient":
    case "retryable":
      return "RETRY";
    case "dependency":
    case "configuration":
    case "logic":
    case "state":
    case "capability":
      return "REPLAN";
    case "permission":
    case "user_input":
      return "ASK_USER";
    case "unrecoverable":
      return "ABORT";
    default:
      return "REPLAN";
  }
}
