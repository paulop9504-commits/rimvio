/**
 * Merge ContextExecutionPlanV1 into EventCandidate.metadata (pure).
 */

import {
  CONTEXT_EXECUTION_PLAN_META_KEY,
  parseContextExecutionPlan,
} from "@/lib/context-execution/context-execution-plan-metadata";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import type { EventCandidate } from "@/lib/events/event-candidate";

function planWireEqual(
  left: ContextExecutionPlanV1 | null,
  right: ContextExecutionPlanV1 | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

export function syncContextExecutionPlanMetadata(input: {
  metadata: Record<string, unknown>;
  plan: ContextExecutionPlanV1;
}): { metadata: Record<string, unknown>; changed: boolean; plan: ContextExecutionPlanV1 } {
  const previous = parseContextExecutionPlan(input.metadata[CONTEXT_EXECUTION_PLAN_META_KEY]);
  const nextMetadata = {
    ...input.metadata,
    [CONTEXT_EXECUTION_PLAN_META_KEY]: input.plan,
  };
  return {
    metadata: nextMetadata,
    changed: !planWireEqual(previous, input.plan),
    plan: input.plan,
  };
}

export function readContextExecutionPlanFromEventCandidate(
  event: EventCandidate | null | undefined,
): ContextExecutionPlanV1 | null {
  if (!event?.metadata || typeof event.metadata !== "object") {
    return null;
  }
  return parseContextExecutionPlan(
    (event.metadata as Record<string, unknown>)[CONTEXT_EXECUTION_PLAN_META_KEY],
  );
}
