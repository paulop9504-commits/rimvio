/**
 * Workspace revision for idempotency — same request + same state → no-op.
 */

import type { ContextWorkspaceState } from "@/lib/context-workspace/types";

export function readWorkspaceRevision(
  state: ContextWorkspaceState | null | undefined,
): string {
  if (!state) return "0";
  const patchLen = state.patches?.length ?? 0;
  const visible = state.nodes.filter((n) => n.visible).length;
  const selected = state.selectedIds.join(",");
  const job = state.agentJob?.id ?? "";
  const fp = state.lastScoutFingerprint ?? "";
  return [
    state.updatedAtIso,
    String(patchLen),
    String(visible),
    selected,
    job,
    fp,
  ].join("|");
}
