/**
 * Intent Convergence Engine — assessment (deterministic gate).
 *
 * Goal: fewest questions. Given a query + what's already answered + how many
 * questions we've already asked, decide whether to ask ONE more convergence
 * question and which axis it should be. The LLM later authors the wording; this
 * layer owns the "should we ask, and about what" decision.
 */
import {
  convergenceSchemaFor,
  detectConvergenceIntent,
  type ConvergenceAxis,
  type ConvergenceIntentType,
} from "@/lib/globe/context-condition-ai/intent-convergence/intent-convergence-schema";
import type { LocalDiscoveryPendingAnswers } from "@/lib/globe/context-condition-ai/local-discovery-action-types";

/** Never fatigue the user — 0~1 questions typical, 2 max. */
export const CONVERGENCE_QUESTION_CAP = 2;

export type IntentConvergenceAssessment =
  | { readonly shouldAsk: false; readonly intentType: ConvergenceIntentType | null }
  | {
      readonly shouldAsk: true;
      readonly intentType: ConvergenceIntentType;
      readonly topAxis: ConvergenceAxis;
      /** Remaining candidate axes (LLM may pick the most-narrowing among these). */
      readonly candidateAxes: readonly ConvergenceAxis[];
    };

export function assessIntentConvergence(input: {
  message: string;
  answers: LocalDiscoveryPendingAnswers;
  askedAxisIds: readonly string[];
  followUpTurn?: boolean;
}): IntentConvergenceAssessment {
  // A chosen chip already converged the intent → search now.
  if (input.answers.activityFocus?.trim()) {
    return { shouldAsk: false, intentType: null };
  }
  // Follow-up refinements ride the existing refinement pipeline, not convergence.
  if (input.followUpTurn) {
    return { shouldAsk: false, intentType: null };
  }

  const intentType = detectConvergenceIntent(input.message);
  if (!intentType) {
    return { shouldAsk: false, intentType: null };
  }

  // Respect the question cap — after enough asks, just search best-effort.
  if (input.askedAxisIds.length >= CONVERGENCE_QUESTION_CAP) {
    return { shouldAsk: false, intentType };
  }

  const asked = new Set(input.askedAxisIds);
  const remaining = convergenceSchemaFor(intentType)
    .axes.filter((axis) => !asked.has(axis.id))
    .slice()
    .sort((a, b) => b.priority - a.priority);

  if (remaining.length === 0) {
    return { shouldAsk: false, intentType };
  }

  return {
    shouldAsk: true,
    intentType,
    topAxis: remaining[0],
    candidateAxes: remaining.slice(0, 3),
  };
}
