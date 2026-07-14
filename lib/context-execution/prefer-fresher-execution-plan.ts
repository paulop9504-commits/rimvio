/**
 * Prefer the Execution Plan with the newer updatedAtIso (Event SSOT vs session).
 */

import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";

function planUpdatedMs(plan: ContextExecutionPlanV1): number {
  const ms = Date.parse(plan.updatedAtIso);
  return Number.isFinite(ms) ? ms : 0;
}

/** Pure — pick freshest non-null plan; ties keep `preferred`. */
export function preferFresherExecutionPlan(
  preferred: ContextExecutionPlanV1 | null | undefined,
  challenger: ContextExecutionPlanV1 | null | undefined,
): ContextExecutionPlanV1 | null {
  if (!preferred && !challenger) {
    return null;
  }
  if (!preferred) {
    return challenger ?? null;
  }
  if (!challenger) {
    return preferred;
  }
  if (preferred.contextId !== challenger.contextId) {
    return preferred;
  }
  return planUpdatedMs(challenger) > planUpdatedMs(preferred)
    ? challenger
    : preferred;
}
