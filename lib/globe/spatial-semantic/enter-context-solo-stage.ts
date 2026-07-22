/**
 * Solo Stage — 1 project = 1 Context on the Globe.
 * Overview = many context dots; select = context_only stage; clear = overview.
 * Scout `focus` / `folded` for the same context are preserved (not clobbered).
 */

import {
  publishContextOnlyGlobeProjection,
  readGlobeProjectionLayerPolicy,
  resetGlobeProjectionLayerPolicy,
} from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";

/** Enter the map stage for one Context (hide sibling context pins). */
export function enterContextSoloStage(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  const policy = readGlobeProjectionLayerPolicy();
  const activeId = policy.activeContextEventId?.trim() ?? "";
  if (
    activeId === id &&
    (policy.mode === "focus" || policy.mode === "folded")
  ) {
    return;
  }
  publishContextOnlyGlobeProjection(id);
}

/** True when Globe is in a non-overview projection for a context. */
export function isGlobeSoloStagePolicy(
  policy: ReturnType<typeof readGlobeProjectionLayerPolicy> = readGlobeProjectionLayerPolicy(),
): boolean {
  return (
    policy.mode !== "overview" && Boolean(policy.activeContextEventId?.trim())
  );
}

/** Leave Solo Stage → Overview (many context dots again). */
export function exitContextSoloStage(options?: {
  onlyIfContextEventId?: string | null;
}): void {
  const onlyId = options?.onlyIfContextEventId?.trim();
  if (onlyId) {
    const policy = readGlobeProjectionLayerPolicy();
    const activeId = policy.activeContextEventId?.trim() ?? "";
    if (activeId && activeId !== onlyId) {
      return;
    }
  }
  resetGlobeProjectionLayerPolicy();
}

export function isContextSoloStageActive(contextEventId?: string | null): boolean {
  const policy = readGlobeProjectionLayerPolicy();
  if (policy.mode === "overview" || !policy.activeContextEventId) {
    return false;
  }
  const id = contextEventId?.trim();
  if (!id) {
    return true;
  }
  return policy.activeContextEventId.trim() === id;
}
