/**
 * Bump Globe projection after Tool / Action Plan success.
 * Notifies subscribers without re-stringifying localStorage (write already emitted).
 */

import {
  notifySessionGraphListeners,
  readSessionGraph,
} from "@/lib/graph-command/session-graph-store";

export const SESSION_GRAPH_PROJECTION_EVENT = "rimvio-session-graph-projection";

/**
 * Ask Globe to re-project dashed markers.
 * Prefer after writeSessionGraph in the same turn — this is a cheap notify-only bump.
 */
export function bumpSessionGraphProjection(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  if (!readSessionGraph(id)) {
    return;
  }
  notifySessionGraphListeners();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SESSION_GRAPH_PROJECTION_EVENT, {
        detail: { contextEventId: id },
      }),
    );
  }
}
