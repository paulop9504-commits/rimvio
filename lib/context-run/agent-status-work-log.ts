/**
 * STEP 8 — Agent Status work-log (chat is not the answer).
 */

import {
  AGENT_PRODUCT_PIPELINE_STATUS_KO,
  formatAgentProductStatusLog,
  readLastAgentProductTurn,
  type AgentProductTurn,
} from "@/lib/context-run/agent-product-pipeline";
import { readAgentRuntimeProjection } from "@/lib/context-run/agent-runtime-projection";

/**
 * Prefer product pipeline last line · else projection status · else fallback.
 */
export function resolveAgentStatusWorkLog(input: {
  readonly contextEventId: string;
  readonly fallbackKo?: string | null;
  readonly turn?: AgentProductTurn | null;
}): string | null {
  const turn =
    input.turn ??
    (readLastAgentProductTurn()?.contextEventId === input.contextEventId
      ? readLastAgentProductTurn()
      : null);
  const fromTurn = formatAgentProductStatusLog(turn);
  if (fromTurn) return fromTurn;

  const proj = readAgentRuntimeProjection(input.contextEventId);
  if (proj?.statusKo?.trim()) return proj.statusKo.trim();

  return input.fallbackKo?.trim() || null;
}

/** Multi-line work log for debug / Agent Status strip. */
export function listAgentStatusWorkLogLines(
  contextEventId: string,
): readonly string[] {
  const turn = readLastAgentProductTurn();
  if (turn?.contextEventId === contextEventId) {
    return turn.statusLog;
  }
  const proj = readAgentRuntimeProjection(contextEventId);
  return proj?.workLog ?? [];
}

export function agentStatusLabelForStage(
  stage: keyof typeof AGENT_PRODUCT_PIPELINE_STATUS_KO,
): string {
  return AGENT_PRODUCT_PIPELINE_STATUS_KO[stage];
}
