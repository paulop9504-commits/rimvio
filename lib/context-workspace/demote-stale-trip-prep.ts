/**
 * Demote non-bookmarked trip_prep drafts when scout replaces inventory (geo/intent shift).
 * Keep in SSOT; hide from Primary / Peek / overview unless bookmarked.
 */

import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

export function isTripPrepDraftSource(source: string): boolean {
  return source === "trip_prep_draft" || source.startsWith("trip_prep_");
}

/**
 * Soft-hide unpinned trip_prep of other domains (contamination).
 * Same-domain draft lodging can stay visible for cart continuity.
 */
export function demoteUnpinnedTripPrepOnScoutReplace(input: {
  readonly nodes: readonly ContextWorkspaceNode[];
  readonly scoutDomain: ContextWorkspaceNode["kind"];
}): ContextWorkspaceNode[] {
  return input.nodes.map((n) => {
    if (n.bookmarked) return n;
    if (n.kind === input.scoutDomain) return n;
    if (!isTripPrepDraftSource(n.source)) return n;
    if (!n.visible && !n.selected) return n;
    return { ...n, visible: false, selected: false };
  });
}
