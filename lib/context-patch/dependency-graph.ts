/**
 * Dependency Graph
 *
 * When a slot changes, which tasks are affected?
 *
 * location changes → hotel, eatery, route, itinerary all invalidated
 * duration changes → itinerary, hotel (nights), budget recalc
 * budget changes   → hotel filter, eatery filter
 *
 * Returns the list of tasks that need recompute.
 */

import type { SlotKey } from "@/lib/context-patch/context-patch-engine";

export type TaskId =
  | "flight"
  | "hotel"
  | "eatery"
  | "route"
  | "itinerary"
  | "activity"
  | "budget_calc"
  | "transport"
  | "packing";

const DEPENDENCY_MAP: Record<SlotKey, readonly TaskId[]> = {
  location:      ["flight", "hotel", "eatery", "route", "itinerary", "activity", "transport"],
  duration:      ["hotel", "itinerary", "budget_calc", "packing"],
  budget:        ["hotel", "eatery", "activity", "budget_calc"],
  hotelCount:    ["hotel", "budget_calc"],
  transport:     ["route", "transport", "budget_calc"],
  companions:    ["hotel", "eatery", "flight", "budget_calc"],
  accommodation: ["hotel", "budget_calc"],
  startDate:     ["flight", "hotel", "itinerary"],
  endDate:       ["flight", "hotel", "itinerary"],
  purpose:       ["activity", "itinerary", "eatery"],
  mealPref:      ["eatery"],
  activity:      ["activity", "itinerary"],
};

export type AffectedTask = {
  readonly taskId: TaskId;
  readonly triggeredBy: readonly SlotKey[];
  readonly priority: number;
};

/**
 * Given changed slot keys, return which tasks need recompute,
 * sorted by priority (most dependencies first).
 */
export function resolveAffectedTasks(
  changedKeys: readonly SlotKey[],
): readonly AffectedTask[] {
  const taskTriggers = new Map<TaskId, SlotKey[]>();

  for (const key of changedKeys) {
    const tasks = DEPENDENCY_MAP[key] ?? [];
    for (const taskId of tasks) {
      const list = taskTriggers.get(taskId) ?? [];
      list.push(key);
      taskTriggers.set(taskId, list);
    }
  }

  const affected: AffectedTask[] = [];
  for (const [taskId, triggeredBy] of taskTriggers) {
    affected.push({
      taskId,
      triggeredBy,
      priority: triggeredBy.length,
    });
  }

  return affected.sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a slot change is "major" (affects 3+ tasks)
 * vs "minor" (affects 1-2 tasks).
 */
export function isMajorChange(changedKeys: readonly SlotKey[]): boolean {
  const affected = resolveAffectedTasks(changedKeys);
  return affected.length >= 3;
}
