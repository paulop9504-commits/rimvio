/**
 * Bump Globe projection after Tool / Action Plan success.
 * Session graph subscribe refreshes brain markers — no chat dump.
 */

import {
  readSessionGraph,
  writeSessionGraph,
} from "@/lib/graph-command/session-graph-store";

export const SESSION_GRAPH_PROJECTION_EVENT = "rimvio-session-graph-projection";

/**
 * Re-stamp graph updatedAt so Globe home re-projects dashed markers.
 */
export function bumpSessionGraphProjection(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  const graph = readSessionGraph(id);
  if (!graph) {
    return;
  }
  writeSessionGraph({
    ...graph,
    updatedAtIso: new Date().toISOString(),
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SESSION_GRAPH_PROJECTION_EVENT, {
        detail: { contextEventId: id },
      }),
    );
  }
}
