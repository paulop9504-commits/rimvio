/**
 * L9 Workspace Plan Conflict — detect schedule conflicts in Workspace SSOT.
 * Used before Conflict Replan; never auto-commits.
 */

import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";

export type WorkspacePlanConflictKind =
  | "duplicate_lodging_day"
  | "day_overcrowded"
  | "step_failed";

export type WorkspacePlanConflict = {
  readonly kind: WorkspacePlanConflictKind;
  readonly dayIndex: number | null;
  readonly reasonKo: string;
  readonly nodeIds: readonly string[];
};

const DAY_TAG = /^day[_-]?(\d+)$/iu;
const MAX_STOPS_PER_DAY = 4;

function nodesByDay(
  nodes: readonly ContextWorkspaceNode[],
): Map<number, ContextWorkspaceNode[]> {
  const map = new Map<number, ContextWorkspaceNode[]>();
  for (const n of nodes) {
    if (!n.visible) continue;
    for (const t of n.tags) {
      const m = t.match(DAY_TAG);
      if (!m?.[1]) continue;
      const day = Number(m[1]);
      if (!Number.isFinite(day) || day < 1) continue;
      const list = map.get(day) ?? [];
      list.push(n);
      map.set(day, list);
    }
  }
  return map;
}

/**
 * After a plan step — scan Workspace for schedule conflicts.
 */
export function detectWorkspacePlanConflict(input: {
  readonly contextEventId: string;
}): WorkspacePlanConflict | null {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) return null;

  const byDay = nodesByDay(state.nodes);
  for (const [day, list] of byDay) {
    const lodgings = list.filter((n) => n.kind === "lodging");
    if (lodgings.length >= 2) {
      return {
        kind: "duplicate_lodging_day",
        dayIndex: day - 1,
        reasonKo: `Day ${day}에 숙소가 ${lodgings.length}곳이에요`,
        nodeIds: lodgings.map((n) => n.id),
      };
    }
    const stops = list.filter(
      (n) =>
        n.kind === "poi" || n.kind === "eatery" || n.kind === "amenity",
    );
    if (stops.length > MAX_STOPS_PER_DAY) {
      return {
        kind: "day_overcrowded",
        dayIndex: day - 1,
        reasonKo: `Day ${day} 일정이 ${stops.length}곳으로 빡빡해요`,
        nodeIds: stops.map((n) => n.id),
      };
    }
  }
  return null;
}
