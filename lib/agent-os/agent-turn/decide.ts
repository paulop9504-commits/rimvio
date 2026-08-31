/**
 * Decision after each observation — wraps existing decideFromObservationRules.
 */

import {
  decideFromObservationRules,
  decideFromStepObservationRules,
} from "@/lib/agent/decision";
import type { AgentObservation, AgentRunObservation } from "@/lib/agent/types";
import type { AgentTurn, AgentTurnDecision, AgentTurnObservation } from "@/lib/agent-os/agent-turn/types";
import { AGENT_TURN_LIMITS } from "@/lib/agent-os/agent-turn/limits";

export function decideAfterObservation(input: {
  readonly turn: AgentTurn;
  readonly observation: AgentTurnObservation;
  readonly limits?: { readonly maxReplans?: number; readonly maxRetriesPerAction?: number };
}): AgentTurnDecision {
  const maxReplans = input.limits?.maxReplans ?? AGENT_TURN_LIMITS.maxReplans;
  const maxRetries = input.limits?.maxRetriesPerAction ?? AGENT_TURN_LIMITS.maxRetriesPerAction;

  if (input.observation.status === "success") {
    return { kind: "continue", reasonKo: "단계가 성공했습니다. 다음으로 진행합니다.", stepId: input.observation.actionId };
  }

  const sameToolRetries = input.turn.actions.filter(
    (a) => a.tool === input.observation.tool && a.status === "failed",
  ).length;

  if (sameToolRetries < maxRetries && input.observation.status === "failed") {
    return {
      kind: "retry",
      reasonKo: "같은 작업을 다시 시도합니다.",
      stepId: input.observation.actionId,
    };
  }

  if (input.turn.replanCount < maxReplans) {
    return {
      kind: "replan",
      reasonKo: "다른 경로로 이어서 수정합니다.",
      stepId: input.observation.actionId,
    };
  }

  return {
    kind: "fail",
    reasonKo: "재시도 한도에 도달했습니다.",
    stepId: input.observation.actionId,
  };
}

export function decideFromExistingRun(obs: AgentRunObservation): AgentTurnDecision {
  const legacy = decideFromObservationRules(obs);
  switch (legacy.type) {
    case "continue":
      return { kind: "continue", reasonKo: "남은 단계를 계속 진행합니다." };
    case "replan":
      return { kind: "replan", reasonKo: legacy.reason };
    case "refine":
      return { kind: "retry", reasonKo: legacy.changes?.reasonKo ?? "막힌 단계만 다시 시도합니다.", stepId: legacy.stepId };
    case "ask_user":
      return { kind: "ask_user", reasonKo: legacy.message };
    case "stop":
      return obs.waitingCommit
        ? { kind: "wait_approval", reasonKo: "사용자 승인이 필요합니다." }
        : { kind: "verify", reasonKo: "실행이 끝났습니다. 검증합니다." };
    default:
      return { kind: "continue", reasonKo: "계속 진행합니다." };
  }
}

export function decideFromExistingStep(obs: AgentObservation): AgentTurnDecision {
  const legacy = decideFromStepObservationRules(obs);
  if (legacy.type === "continue") {
    return { kind: "continue", reasonKo: obs.summaryKo ?? "다음 단계로 진행합니다." };
  }
  if (legacy.type === "refine") {
    return { kind: "retry", reasonKo: legacy.changes?.reasonKo ?? "단계 재시도", stepId: obs.stepId };
  }
  if (legacy.type === "replan") {
    return { kind: "replan", reasonKo: legacy.reason };
  }
  if (legacy.type === "ask_user") {
    return { kind: "ask_user", reasonKo: legacy.message };
  }
  return { kind: "verify", reasonKo: "검증으로 넘어갑니다." };
}

export function decideAfterVerification(input: {
  readonly passed: boolean;
  readonly replanCount: number;
  readonly maxReplans: number;
}): AgentTurnDecision {
  if (input.passed) {
    return { kind: "complete", reasonKo: "검증을 통과했습니다." };
  }
  if (input.replanCount < input.maxReplans) {
    return { kind: "replan", reasonKo: "검증에 실패했습니다. 수정 후 다시 확인합니다." };
  }
  return { kind: "fail", reasonKo: "검증에 실패했고 수정 한도에 도달했습니다." };
}
