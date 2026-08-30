/**
 * Complexity → Decision Level. Simple requests stay cheap.
 */

import type { DecisionEngineInput, DecisionLevel } from "@/lib/agent-os/decision-engine/types";

export function selectDecisionLevel(input: {
  readonly utterance: string;
  readonly intent: string;
  readonly requirementCount: number;
  readonly lastObservationFailed?: boolean;
  readonly architectureConflict?: boolean;
}): DecisionLevel {
  const text = input.utterance.trim();

  if (
    input.architectureConflict ||
    /설계|아키텍처|architecture|tradeoff|호환|adapter|가장 좋은 방식/i.test(text)
  ) {
    return 4;
  }

  if (input.lastObservationFailed || /실패|고치|왜|대안|다른 방법/i.test(text)) {
    return 3;
  }

  if (
    input.requirementCount >= 3 ||
    (input.intent === "create" && /그리고|\+|및|,|부터|플랫폼/.test(text))
  ) {
    return 2;
  }

  if (input.intent === "inspect" || /열어줘|보여줘|현재 상태/.test(text)) {
    return 0;
  }

  if (input.intent === "test" && input.requirementCount <= 1 && !/실패/.test(text)) {
    return 0;
  }

  if (input.intent === "connect" || input.requirementCount <= 1) {
    return 1;
  }

  if (input.intent === "create" || input.intent === "modify") {
    return input.requirementCount >= 3 ? 2 : 1;
  }

  return 1;
}

export function shouldEscalate(input: {
  readonly level: DecisionLevel;
  readonly confidence: number;
  readonly failed?: boolean;
  readonly architectureConflict?: boolean;
}): boolean {
  if (input.level >= 4) return false;
  if (input.architectureConflict && input.level < 4) return true;
  if (input.failed && input.level < 3) return true;
  if (input.confidence < 0.7 && input.level < 3) return true;
  if (input.confidence < 0.5) return true;
  return false;
}

export function complexityScore(input: DecisionEngineInput): number {
  let score = 0;
  if (input.intent === "inspect") score += 0;
  else if (input.intent === "test") score += 1;
  else if (input.intent === "create") score += 2;
  score += Math.min(4, input.goal.requirements.length);
  if (input.lastObservationFailed) score += 3;
  if (input.architectureConflict) score += 4;
  return score;
}
