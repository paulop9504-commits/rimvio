/**
 * Commit Execution Plan to EventCandidate SSOT (local + vault queue).
 */

import { syncContextExecutionPlanMetadata } from "@/lib/context-execution/sync-context-execution-plan-metadata";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function commitContextExecutionPlan(input: {
  event: EventCandidate;
  plan: ContextExecutionPlanV1;
}): { event: EventCandidate; changed: boolean } {
  const sync = syncContextExecutionPlanMetadata({
    metadata: { ...(input.event.metadata ?? {}) },
    plan: input.plan,
  });
  if (!sync.changed) {
    return { event: input.event, changed: false };
  }
  const committed = commitEventUpsert({
    ...input.event,
    metadata: sync.metadata,
    updatedAt: new Date().toISOString(),
  });
  return { event: committed, changed: true };
}
