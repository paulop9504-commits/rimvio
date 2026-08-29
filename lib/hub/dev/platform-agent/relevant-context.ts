/**
 * Capability #29 — Relevant Context Selection.
 * Score and rank source refs / capabilities for the current goal.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { PlatformGoal } from "@/lib/hub/dev/platform-agent/platform-goal";
import {
  buildPlatformSourceMap,
  type PlatformSourceRef,
} from "@/lib/hub/dev/platform-agent/platform-source-map";

export type ScoredContextRef = PlatformSourceRef & {
  readonly score: number;
  readonly reasonKo: string;
};

export type RelevantContextSelection = {
  readonly selected: readonly ScoredContextRef[];
  readonly totalCandidates: number;
  readonly limit: number;
};

function scoreRef(ref: PlatformSourceRef, goal: PlatformGoal, utterance: string): ScoredContextRef {
  let score = 0;
  const hay = `${ref.id} ${ref.label} ${ref.paths.join(" ")}`.toLowerCase();
  const utter = utterance.toLowerCase();

  for (const cap of goal.requestedCapabilities) {
    if (ref.id === cap || hay.includes(cap.toLowerCase())) score += 40;
  }

  if (goal.scope.kind === "code_direct") {
    if (goal.scope.targetCapability && ref.id === goal.scope.targetCapability) score += 50;
    const targetPath = goal.scope.targetPath;
    if (targetPath && ref.paths.some((p) => p.includes(targetPath))) {
      score += 45;
    }
  }

  for (const token of utter.split(/\s+/).filter((t) => t.length > 2)) {
    if (hay.includes(token)) score += 8;
  }

  if (ref.kind === "capability") score += 10;
  if (ref.kind === "schema") score += 5;
  if (ref.kind === "workflow" && goal.flows.length) score += 15;

  const reasonKo =
    score >= 50
      ? "Goal 직접 매칭"
      : score >= 25
        ? "관련 capability"
        : score >= 10
          ? "키워드 매칭"
          : "낮은 관련도";

  return { ...ref, score, reasonKo };
}

/** Select top-N relevant context refs for agent focus (not full repo). */
export function selectRelevantContext(input: {
  readonly goal: PlatformGoal;
  readonly utterance: string;
  readonly draft: PlatformDraft;
  readonly limit?: number;
}): RelevantContextSelection {
  const limit = input.limit ?? 6;
  const map = buildPlatformSourceMap(input.draft);
  const scored = map
    .map((ref) => scoreRef(ref, input.goal, input.utterance))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    selected: scored.slice(0, limit),
    totalCandidates: map.length,
    limit,
  };
}
