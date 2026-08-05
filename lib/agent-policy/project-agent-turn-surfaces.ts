/**
 * Dual surface projector — Callout vs LLM reply from the same facts.
 * ADR-048: never invent twice; chat is not SSOT.
 */

import type { WorkspaceMutationMode } from "@/lib/agent-policy/cursor-agent-policy";

export type AgentTurnSurfaces = {
  /** Object-anchored · 1–3 lines for Callout / Decision Trace. */
  readonly calloutLinesKo: readonly string[];
  /** Short Workspace AI work-log (not SSOT). */
  readonly llmReplyKo: string;
};

export function projectAgentTurnSurfaces(input: {
  readonly mutationMode: WorkspaceMutationMode;
  readonly reasonKo?: string | null;
  readonly factsKo?: readonly string[] | null;
  readonly candidateCount?: number | null;
  readonly entityTitlesKo?: readonly string[] | null;
}): AgentTurnSurfaces {
  const facts = (input.factsKo ?? [])
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  const titles = (input.entityTitlesKo ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);

  const calloutLinesKo: string[] = [];
  if (input.reasonKo?.trim()) {
    calloutLinesKo.push(input.reasonKo.trim());
  }
  for (const f of facts) {
    if (!calloutLinesKo.includes(f)) calloutLinesKo.push(f);
  }
  if (
    input.candidateCount != null &&
    input.candidateCount > 0 &&
    calloutLinesKo.length < 3
  ) {
    calloutLinesKo.push(`후보 ${input.candidateCount}곳`);
  }
  for (const t of titles) {
    if (calloutLinesKo.length >= 3) break;
    calloutLinesKo.push(t);
  }

  const modeLine =
    input.mutationMode === "replace"
      ? "후보를 다시 찾아 교체했어요"
      : input.mutationMode === "refine"
        ? "지금 셋 안에서 다듬었어요"
        : "작업을 반영했어요";

  const llmReplyKo = [modeLine, input.reasonKo?.trim(), titles[0] ? `예: ${titles[0]}` : null]
    .filter(Boolean)
    .join(" · ");

  return {
    calloutLinesKo: calloutLinesKo.slice(0, 3),
    llmReplyKo,
  };
}
