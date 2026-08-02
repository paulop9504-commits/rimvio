/**
 * Reality Diff — Before / After snapshot for Draft Preview.
 *
 * Diff is never a Reality write. Apply happens only via Draft approve.
 */

import {
  computeDraftImpact,
  type DraftImpact,
} from "@/lib/draft/impact";
import {
  buildRealityDiffFromIntent,
  formatRealityDiffGitStyleKo,
} from "@/lib/workspace-command/reality-diff";
import type { WorkspaceIntent } from "@/lib/workspace-command/types";
import type { Workspace } from "@/lib/workspace/workspace-types";

export type DraftSnapshot = {
  readonly labelKo: string;
  readonly visibleCount: number;
  readonly hotelType?: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
};

export type RealityDraftDiff = {
  readonly before: DraftSnapshot;
  readonly after: DraftSnapshot;
  readonly impact: DraftImpact;
};

export function buildDraftDiff(input: {
  readonly before: DraftSnapshot;
  readonly after: DraftSnapshot;
  readonly impactExtras?: Readonly<Record<string, unknown>>;
}): RealityDraftDiff {
  const impact = computeDraftImpact(
    input.before.visibleCount,
    input.after.visibleCount,
    input.impactExtras,
  );
  return {
    before: input.before,
    after: input.after,
    impact,
  };
}

/**
 * Build Diff from Workspace + Intent (reuses workspace-command Reality Diff).
 */
export function buildDraftDiffFromIntent(input: {
  readonly workspace: Workspace | null;
  readonly intent: WorkspaceIntent;
}): RealityDraftDiff {
  const wire = buildRealityDiffFromIntent(input);
  const beforeType = String(wire.before.hotelType ?? "all");
  const afterType = String(wire.after.hotelType ?? beforeType);
  const beforeCount = Number(
    wire.before.visibleHotels ?? wire.impact.beforeVisibleCount,
  );
  const afterCount = Number(
    wire.after.visibleHotels ?? wire.impact.afterVisibleCount,
  );

  return buildDraftDiff({
    before: {
      labelKo:
        beforeType === "all" || beforeType === "Hotel Universe"
          ? "호텔 전체"
          : String(wire.before.labelKo ?? beforeType),
      visibleCount: beforeCount,
      hotelType: beforeType,
      attrs: { ...wire.before },
    },
    after: {
      labelKo:
        afterType === "capsule"
          ? "캡슐호텔"
          : String(wire.after.labelKo ?? afterType),
      visibleCount: afterCount,
      hotelType: afterType,
      attrs: { ...wire.after },
    },
    impactExtras: { ...wire.impact.details },
  });
}

/**
 * UX card body:
 *
 * Before
 * 호텔 전체
 *
 * After
 * 캡슐호텔
 *
 * Impact
 * -80%
 * 후보 감소
 */
export function formatDraftDiffUxKo(diff: RealityDraftDiff): string {
  return [
    "Before",
    diff.before.labelKo,
    "",
    "After",
    diff.after.labelKo,
    "",
    "Impact",
    diff.impact.pctLabelKo,
    diff.impact.effectLabelKo,
  ].join("\n");
}

export function formatDraftDiffGitStyleKo(diff: RealityDraftDiff): string {
  return [
    `Before: ${diff.before.labelKo} · ${diff.before.visibleCount}개`,
    `After:  ${diff.after.labelKo} · ${diff.after.visibleCount}개`,
    `Impact: ${diff.impact.labelKo}`,
  ].join("\n");
}

/** Bridge helper — keep workspace-command git formatter available */
export { formatRealityDiffGitStyleKo };
