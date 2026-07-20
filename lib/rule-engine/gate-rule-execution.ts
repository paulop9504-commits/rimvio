/**
 * Rule Constitution execution gate — clarify/blocked must stop planner + graph.
 */

import type { RuleEngineDecision } from "@/lib/rule-engine/evaluate-utterance-rules";
import { isCompoundActionUtterance } from "@/lib/action-planner/build-compare-reserve-plan";

export type RuleExecutionGate =
  | { readonly allow: true }
  | {
      readonly allow: false;
      readonly kind: "clarify" | "blocked";
      readonly assistantReplyKo: string;
    };

/**
 * Before Action Planner / Graph Engine.
 * Compound compare→reserve is allowed through (plan ends at wait_commit).
 */
export function gateRuleDecisionForExecution(input: {
  readonly decision: RuleEngineDecision;
  readonly utterance: string;
}): RuleExecutionGate {
  const { decision, utterance } = input;
  const compound = isCompoundActionUtterance(utterance);

  if (decision.clarify?.kind === "clarify") {
    // Compound plans resolve entities themselves — do not stop on Reserve clarify.
    if (compound) {
      return { allow: true };
    }
    return {
      allow: false,
      kind: "clarify",
      assistantReplyKo: decision.clarify.questionKo,
    };
  }

  if (decision.clarify?.kind === "blocked") {
    if (compound) {
      return { allow: true };
    }
    // Empty-graph Reserve/Share/Delete — recover chips later (never silent stop).
    return { allow: true };
  }

  return { allow: true };
}

/** Field Commit only when prepare ops exist, or Reality-dangerous Intent with Commit flag. */
export function ruleRequiresFieldCommit(
  decision: RuleEngineDecision,
  reservedOpIds: readonly string[],
): boolean {
  if (reservedOpIds.length > 0) {
    return true;
  }
  // Bare Delete/Share must not open Field — soft confirm / graph only.
  return decision.requiresCommit;
}
