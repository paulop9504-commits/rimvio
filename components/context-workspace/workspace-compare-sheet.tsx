"use client";

/**
 * @deprecated Compare Decision is map Projection (DecisionCallout), not a sheet.
 * Always returns null — kept so old imports don't break build.
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace";

export type WorkspaceCompareSheetProps = {
  open: boolean;
  contextEventId: string;
  workspace: ContextWorkspaceState;
  onClose: () => void;
  onSelect: (nodeId: string) => void;
};

/** @deprecated Always returns null — use WorkspaceMapCompareOverlay. */
export function WorkspaceCompareSheet(_props: WorkspaceCompareSheetProps) {
  return null;
}
