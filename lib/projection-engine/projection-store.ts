/**
 * Projection store — last Projection Snapshot + event log (UI SSOT).
 * Does not hold Reality Object source data.
 */

import type {
  ProjectionEvent,
  ProjectionSnapshot,
} from "@/lib/projection-engine/projection-types";

const snapshots = new Map<string, ProjectionSnapshot>();
const eventsByWorkspace = new Map<string, ProjectionEvent[]>();

const MAX_EVENTS = 80;

export function writeProjectionSnapshot(snapshot: ProjectionSnapshot): void {
  snapshots.set(snapshot.workspaceId, snapshot);
}

export function readProjectionSnapshot(
  workspaceId: string,
): ProjectionSnapshot | null {
  return snapshots.get(workspaceId.trim()) ?? null;
}

export function appendProjectionEvent(event: ProjectionEvent): void {
  const id = event.workspaceId.trim();
  const list = eventsByWorkspace.get(id) ?? [];
  eventsByWorkspace.set(id, [...list, event].slice(-MAX_EVENTS));
}

export function listProjectionEvents(
  workspaceId: string,
): readonly ProjectionEvent[] {
  return eventsByWorkspace.get(workspaceId.trim()) ?? [];
}

export function clearProjectionForTests(workspaceId?: string): void {
  if (!workspaceId) {
    snapshots.clear();
    eventsByWorkspace.clear();
    return;
  }
  const id = workspaceId.trim();
  snapshots.delete(id);
  eventsByWorkspace.delete(id);
}
