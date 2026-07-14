/**
 * Plan step → Engine schedule — active Runtime step owns which Engine runs next.
 * Cursor analogue: Todo schedules the tool; utterance may override if another engine matches.
 */

import { readActivePlanStep } from "@/lib/context-execution/read-active-plan-step";
import { readContextExecutionPlanFromEvent } from "@/lib/context-execution/context-execution-plan-metadata";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import type { EventCandidate } from "@/lib/events/event-candidate";

const SCHEDULE_ACTIVE_STATUSES = new Set([
  "running",
  "ready",
]);

/** Pure — executing plan + active completable/running step → scheduled Engine SKU. */
export function resolveScheduledEngineIdFromExecutionPlan(
  plan: ContextExecutionPlanV1 | null | undefined,
): RimvioEngineId | null {
  if (!plan || plan.osPhase !== "executing") {
    return null;
  }
  const step = readActivePlanStep(plan);
  if (!step?.engineId) {
    return null;
  }
  if (!SCHEDULE_ACTIVE_STATUSES.has(step.status)) {
    return null;
  }
  return step.engineId;
}

export function resolveScheduledEngineIdFromEvent(
  event: EventCandidate | null | undefined,
): RimvioEngineId | null {
  if (!event) {
    return null;
  }
  return resolveScheduledEngineIdFromExecutionPlan(
    readContextExecutionPlanFromEvent(event),
  );
}
