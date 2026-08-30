/**
 * Single Decision Engine — L0 Reactive → L4 Strategic, with escalation.
 * Deterministic scoring + policy first. Does not call tools.
 */

import type {
  DecisionContract,
  DecisionEngineInput,
  DecisionLevel,
} from "@/lib/agent-os/decision-engine/types";
import { selectDecisionLevel, shouldEscalate } from "@/lib/agent-os/decision-engine/complexity";
import { goalSatisfied } from "@/lib/agent-os/decision-engine/goal-compiler";
import { firstMissingDependency, pickNextCandidate } from "@/lib/agent-os/decision-engine/candidates";
import { actionForFailure, classifyDecisionFailure } from "@/lib/agent-os/decision-engine/failure";
import { generateAlternatives } from "@/lib/agent-os/decision-engine/alternatives";
import { shouldReplan } from "@/lib/agent-os/decision-engine/plan-mutation";
import { resolveAmbiguity } from "@/lib/agent-os/decision-engine/ambiguity";
import { toolRequiresApproval } from "@/lib/agent-os/decision-engine/capability-catalog";
import { evaluateToolApproval } from "@/lib/agent/approval/approval-engine";

function contract(partial: Omit<DecisionContract, "alternatives" | "escalatedFrom"> & {
  readonly alternatives?: DecisionContract["alternatives"];
  readonly escalatedFrom?: DecisionLevel | null;
}): DecisionContract {
  return {
    alternatives: partial.alternatives ?? [],
    escalatedFrom: partial.escalatedFrom ?? null,
    ...partial,
  };
}

function decideAtLevel(level: DecisionLevel, input: DecisionEngineInput): DecisionContract {
  const next = pickNextCandidate(input.candidates);
  const missingDep = firstMissingDependency(input.candidates);

  if (level === 0) {
    if (input.intent === "inspect") {
      return contract({
        decision: "ACT",
        actionId: "workspace.inspect",
        toolId: "workspace.inspect",
        reason: "inspect current state",
        reasonKo: "현재 상태를 바로 확인합니다.",
        confidence: 0.96,
        decisionLevel: 0,
        failureType: null,
      });
    }
    if (input.intent === "test") {
      return contract({
        decision: "ACT",
        actionId: "test.run",
        toolId: "test.run",
        reason: "run available tests",
        reasonKo: "가능한 테스트를 실행합니다.",
        confidence: 0.94,
        decisionLevel: 0,
        failureType: null,
      });
    }
    return contract({
      decision: "CONTINUE",
      actionId: next?.actionId ?? null,
      toolId: next?.toolId ?? null,
      reason: "reactive pass-through",
      reasonKo: "바로 이어서 진행합니다.",
      confidence: 0.8,
      decisionLevel: 0,
      failureType: null,
    });
  }

  if (level === 1) {
    if (next?.alreadyPresent) {
      return contract({
        decision: "COMPLETE",
        actionId: null,
        toolId: null,
        reason: "capability already present",
        reasonKo: "이미 있는 기능입니다. 다시 만들지 않습니다.",
        confidence: 0.93,
        decisionLevel: 1,
        failureType: null,
      });
    }
    if (missingDep && next && next.missingDeps.length > 0) {
      return contract({
        decision: "ACT",
        actionId: "capability.create",
        toolId: "capability.create",
        reason: `missing dependency ${missingDep}`,
        reasonKo: `${missingDep}이(가) 없어 먼저 준비합니다.`,
        confidence: 0.88,
        decisionLevel: 1,
        failureType: "dependency",
      });
    }
    if (next) {
      return contract({
        decision: "ACT",
        actionId: next.actionId,
        toolId: next.toolId,
        reason: "next missing capability",
        reasonKo: `${next.labelKo}이(가) 다음으로 필요합니다.`,
        confidence: 0.86,
        decisionLevel: 1,
        failureType: null,
      });
    }
    return contract({
      decision: "VERIFY",
      actionId: null,
      toolId: null,
      reason: "no missing action",
      reasonKo: "추가로 만들 기능이 없습니다. 확인합니다.",
      confidence: 0.8,
      decisionLevel: 1,
      failureType: null,
    });
  }

  if (level === 2) {
    if (goalSatisfied(input.goal) && !input.lastObservationFailed) {
      return contract({
        decision: "VERIFY",
        actionId: null,
        toolId: null,
        reason: "all subgoals met",
        reasonKo: "필요한 구성이 갖춰졌습니다. 검증합니다.",
        confidence: 0.9,
        decisionLevel: 2,
        failureType: null,
      });
    }
    return contract({
      decision: "ACT",
      actionId: next?.actionId ?? "resource.apply",
      toolId: next?.toolId ?? "resource.apply",
      reason: "execute next planned dependency",
      reasonKo: "의존 순서대로 다음 작업을 진행합니다.",
      confidence: 0.84,
      decisionLevel: 2,
      failureType: null,
    });
  }

  if (level === 3) {
    const failure = input.lastFailureType ?? classifyDecisionFailure({
      missingDependency: Boolean(missingDep),
      capabilityMissing: input.candidates.every((c) => c.alreadyPresent === false && c.missingDeps.length > 2),
    });
    const alts = generateAlternatives({
      failedToolId: input.lastToolId ?? null,
      candidates: input.candidates,
      failureType: failure,
    });
    const policy = actionForFailure(failure);
    const retries = input.retryCount ?? 0;
    const maxRetries = input.maxRetries ?? 2;
    if (policy === "RETRY" && retries < maxRetries) {
      return contract({
        decision: "RETRY",
        actionId: input.lastToolId ?? null,
        toolId: input.lastToolId ?? null,
        reason: `retry after ${failure}`,
        reasonKo: "일시적인 문제로 보고 같은 작업을 다시 시도합니다.",
        confidence: 0.72,
        decisionLevel: 3,
        failureType: failure,
        alternatives: alts,
      });
    }
    const best = alts[0];
    return contract({
      decision: policy === "ASK_USER" ? "ASK_USER" : policy === "ABORT" ? "ABORT" : "REPLAN",
      actionId: best?.id ?? null,
      toolId: best?.toolId ?? null,
      reason: `adaptive after ${failure}`,
      reasonKo: best?.reasonKo ?? "실패 원인을 보고 다른 경로로 수정합니다.",
      confidence: best ? 0.74 : 0.55,
      decisionLevel: 3,
      failureType: failure,
      alternatives: alts,
    });
  }

  // LEVEL 4 — strategic
  const alts = generateAlternatives({
    failedToolId: input.lastToolId ?? null,
    candidates: input.candidates,
    failureType: "capability",
  });
  if (input.architectureConflict) {
    return contract({
      decision: "REPLAN",
      actionId: "resource.apply",
      toolId: "resource.apply",
      reason: "architecture mismatch — prefer adapter over rewrite",
      reasonKo:
        "현재 결제 기능과 주문 구조가 직접 호환되지 않습니다. 주문 모델을 바꾸기보다 adapter를 두는 편이 기존 구조를 덜 바꿉니다.",
      confidence: 0.78,
      decisionLevel: 4,
      failureType: "capability",
      alternatives: alts,
    });
  }
  if ((input.replanCount ?? 0) >= (input.maxReplans ?? 3)) {
    return contract({
      decision: "ABORT",
      actionId: null,
      toolId: null,
      reason: "replan limit",
      reasonKo: "여러 번 수정했지만 현재 환경에서는 더 진행하기 어렵습니다.",
      confidence: 0.7,
      decisionLevel: 4,
      failureType: "unrecoverable",
      alternatives: alts,
    });
  }
  return contract({
    decision: "REPLAN",
    actionId: alts[0]?.id ?? next?.actionId ?? null,
    toolId: alts[0]?.toolId ?? next?.toolId ?? null,
    reason: "strategic replan",
    reasonKo: "지금 계획 자체가 목표에 맞는지 다시 맞춰 진행합니다.",
    confidence: 0.68,
    decisionLevel: 4,
    failureType: input.lastFailureType ?? null,
    alternatives: alts,
  });
}

export function decideWithEngine(input: DecisionEngineInput): DecisionContract {
  const ambiguity = resolveAmbiguity({
    utterance: input.utterance,
    surface: input.surface,
    focusedEntityIds: input.focusedEntityIds,
  });
  if (ambiguity.kind === "ask") {
    return contract({
      decision: "ASK_USER",
      actionId: null,
      toolId: null,
      reason: "ambiguous target",
      reasonKo: ambiguity.reasonKo,
      confidence: 0.4,
      decisionLevel: 1,
      failureType: "user_input",
    });
  }

  if (
    goalSatisfied(input.goal) &&
    !input.lastObservationFailed &&
    input.intent !== "inspect" &&
    input.intent !== "test" &&
    input.intent !== "connect"
  ) {
    return contract({
      decision: "COMPLETE",
      actionId: null,
      toolId: null,
      reason: "goal satisfied",
      reasonKo: "요청한 조건이 이미 충족되어 있습니다.",
      confidence: 0.92,
      decisionLevel: 1,
      failureType: null,
    });
  }

  let level =
    input.forcedLevel ??
    selectDecisionLevel({
      utterance: input.utterance,
      intent: input.intent,
      requirementCount: input.goal.requirements.length,
      lastObservationFailed: input.lastObservationFailed,
      architectureConflict: input.architectureConflict,
    });

  let decision = decideAtLevel(level, input);
  let from: DecisionLevel | null = null;

  while (
    shouldEscalate({
      level,
      confidence: decision.confidence,
      failed: input.lastObservationFailed,
      architectureConflict: input.architectureConflict,
    }) &&
    level < 4
  ) {
    from = level;
    level = (level + 1) as DecisionLevel;
    decision = decideAtLevel(level, input);
    decision = { ...decision, escalatedFrom: from, decisionLevel: level };
  }

  const toolId = decision.toolId;
  if (toolId && toolRequiresApproval(toolId)) {
    const approval = evaluateToolApproval({ toolId });
    if (approval.decision === "require_approval") {
      return {
        ...decision,
        decision: "WAIT_APPROVAL",
        reason: approval.reasonKo,
        reasonKo: approval.reasonKo,
        confidence: Math.max(decision.confidence, 0.9),
      };
    }
  }

  if (
    shouldReplan({
      actionFailed: input.lastObservationFailed && decision.decision === "CONTINUE",
    }) &&
    decision.decision === "CONTINUE"
  ) {
    return { ...decision, decision: "REPLAN" };
  }

  if (decision.confidence < 0.5 && decision.decision !== "ASK_USER" && decision.decision !== "ABORT") {
    return {
      ...decision,
      decision: "ASK_USER",
      reasonKo: "확신이 부족합니다. 어떻게 진행할지 알려 주세요.",
      failureType: "user_input",
    };
  }

  return decision;
}

export function decisionKindToTurn(kind: DecisionContract["decision"]): string {
  switch (kind) {
    case "ACT":
    case "CONTINUE":
      return "continue";
    case "VERIFY":
      return "verify";
    case "REPLAN":
      return "replan";
    case "RETRY":
      return "retry";
    case "ASK_USER":
      return "ask_user";
    case "WAIT_APPROVAL":
      return "wait_approval";
    case "COMPLETE":
      return "complete";
    case "ABORT":
      return "fail";
    default:
      return "continue";
  }
}
