/**
 * Field (맞춤) bottom-nav badge = Reality Queue pending count.
 * 0 → hide badge. Suggested tab prefers queue when anything is waiting.
 * @see UX playbook #4 — 맞춤 배지 = queueCount
 */

import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";

/** Badge number for AppNav — 0 means no badge. */
export function resolveFieldNavBadgeCount(queueCount: number): number {
  if (!Number.isFinite(queueCount) || queueCount <= 0) {
    return 0;
  }
  return Math.floor(queueCount);
}

export function resolveFieldNavSuggestedTab(input: {
  queueCount: number;
  tradeCount: number;
  mineCount: number;
}): FieldDashboardTab {
  if (resolveFieldNavBadgeCount(input.queueCount) > 0) {
    return "queue";
  }
  if (input.tradeCount > 0) {
    return "trades";
  }
  if (input.mineCount > 0) {
    return "mine";
  }
  return "queue";
}
