/**
 * Impact Analysis for Draft Actions — Workspace preview only.
 */

import type { WorkspaceImpact, WorkspaceIntent } from "@/lib/workspace-command/types";
import {
  analyzeVisibleImpact,
  buildRealityDiffFromIntent,
} from "@/lib/workspace-command/reality-diff";
import type { Workspace } from "@/lib/workspace/workspace-types";

export function analyzeDraftImpact(input: {
  readonly workspace: Workspace | null;
  readonly intent: WorkspaceIntent;
}): WorkspaceImpact {
  const diff = buildRealityDiffFromIntent(input);
  return diff.impact;
}

export function impactLinesKo(impact: WorkspaceImpact): readonly string[] {
  const lines = [impact.summaryKo];
  if (impact.visibleHotelsDeltaPct != null && impact.visibleHotelsDeltaPct < 0) {
    lines.push(
      `후보 감소 ${impact.beforeVisibleCount - impact.afterVisibleCount}개`,
    );
  }
  return lines;
}

export { analyzeVisibleImpact };
