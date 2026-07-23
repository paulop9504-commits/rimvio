/**
 * Map results must not paint the 3D Globe until Workspace Commit.
 * Covers lodging · eatery · poi · amenity (any map-needed work).
 */

import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import type { ContextWorkspaceDomain } from "@/lib/context-workspace/types";

const MAP_MARKER_FAMILIES = new Set([
  "lodging",
  "eatery",
  "poi",
  "amenity",
  "activity",
]);

/**
 * False while a provisional map Workspace is open.
 * True after Commit (or no workspace) — Globe may show those place nodes.
 */
export function shouldProjectMapResultsToGlobe(
  contextEventId: string | null | undefined,
): boolean {
  const id = contextEventId?.trim() ?? "";
  if (!id) {
    return true;
  }
  if (hasProvisionalContextWorkspace(id)) {
    return false;
  }
  const state = readContextWorkspace(id);
  if (state?.status === "committed") {
    return true;
  }
  return !state || state.status === "closed";
}

/** @deprecated use shouldProjectMapResultsToGlobe */
export function shouldProjectLodgingToGlobe(
  contextEventId: string | null | undefined,
): boolean {
  return shouldProjectMapResultsToGlobe(contextEventId);
}

/** Globe marker families to hide while Workspace owns the map edit. */
export function globeFamiliesHiddenByWorkspace(
  contextEventId: string | null | undefined,
): ReadonlySet<string> {
  if (shouldProjectMapResultsToGlobe(contextEventId)) {
    return new Set();
  }
  const state = readContextWorkspace(contextEventId?.trim() ?? "");
  if (!state || state.status === "closed") {
    return new Set();
  }
  // Hide all map place families while editing — Workspace is the map.
  return MAP_MARKER_FAMILIES;
}

export function workspaceDomainToGlobeFamily(
  domain: ContextWorkspaceDomain,
): string {
  return domain;
}
