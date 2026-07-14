import { appendEngineEventToMetadata } from "@/lib/engine/engine-event-metadata";
import type { RimvioEngineEventKind } from "@/lib/engine/engine-event-metadata";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import {
  queueEngineTeamPassAfterTouch,
  type EngineTeamPassPendingV1,
} from "@/lib/engine/team-collab/engine-pass-queue";
import {
  queueEngineFieldHandoffAfterMain,
  type EngineFieldHandoffPendingV1,
} from "@/lib/engine/team-collab/field-handoff-queue";
import { stampMultiOperatorRole } from "@/lib/engine/team-collab/multi-operator-approval";
import { readActivePlanStep } from "@/lib/context-execution/read-active-plan-step";
import { readContextExecutionPlanFromMetadata } from "@/lib/context-execution/context-execution-plan-metadata";

const TOUCH_KINDS: ReadonlySet<RimvioEngineEventKind> = new Set([
  "scout_complete",
  "main_selected",
]);

/**
 * Append lifecycle event + queue team pass when the touch succeeded.
 * On MAIN also queues Field handoff (Phase 2) — never Commits Reality.
 */
export function appendEngineEventWithTeamPass(input: {
  metadata?: Record<string, unknown> | null;
  engineId: RimvioEngineId;
  kind: RimvioEngineEventKind;
  executionNodeId?: string | null;
  payload?: Record<string, unknown>;
  now?: Date;
}): {
  metadata: Record<string, unknown>;
  pendingPass: EngineTeamPassPendingV1 | null;
  pendingFieldHandoff: EngineFieldHandoffPendingV1 | null;
} {
  let metadata = appendEngineEventToMetadata({
    metadata: input.metadata,
    engineId: input.engineId,
    kind: input.kind,
    executionNodeId: input.executionNodeId,
    payload: input.payload,
    now: input.now,
  });

  if (!TOUCH_KINDS.has(input.kind)) {
    return { metadata, pendingPass: null, pendingFieldHandoff: null };
  }

  const plan = readContextExecutionPlanFromMetadata(metadata);
  const nextStep = plan
    ? (() => {
        const active = readActivePlanStep(plan);
        if (!active) {
          return null;
        }
        const ordered = [...plan.steps].sort((a, b) => a.order - b.order);
        const idx = ordered.findIndex((step) => step.stepId === active.stepId);
        if (idx < 0) {
          return null;
        }
        return ordered.slice(idx + 1).find((step) => step.engineId) ?? null;
      })()
    : null;

  const reason = input.kind === "main_selected" ? "assist" : "pass";
  const queued = queueEngineTeamPassAfterTouch({
    metadata,
    fromEngineId: input.engineId,
    toEngineId: nextStep?.engineId ?? null,
    reason,
    now: input.now,
  });
  metadata = queued.metadata;

  if (queued.pending) {
    metadata = appendEngineEventToMetadata({
      metadata,
      engineId: input.engineId,
      kind: queued.pending.reason === "assist" ? "assist" : "pass",
      executionNodeId: input.executionNodeId,
      payload: {
        toEngineId: queued.pending.toEngineId,
        seedUtterance: queued.pending.seedUtterance,
        reason: queued.pending.reason,
      },
      now: input.now,
    });
  }

  let pendingFieldHandoff: EngineFieldHandoffPendingV1 | null = null;
  if (input.kind === "main_selected") {
    const fieldQueued = queueEngineFieldHandoffAfterMain({
      metadata,
      fromEngineId: input.engineId,
      now: input.now,
    });
    metadata = fieldQueued.metadata;
    pendingFieldHandoff = fieldQueued.pending;
    metadata = stampMultiOperatorRole({
      metadata,
      role: "operator",
      now: input.now,
    });
    metadata = appendEngineEventToMetadata({
      metadata,
      engineId: input.engineId,
      kind: "field_ready",
      executionNodeId: input.executionNodeId,
      payload: {
        tab: fieldQueued.pending.tab,
        hintKo: fieldQueued.pending.hintKo,
      },
      now: input.now,
    });
  }

  return {
    metadata,
    pendingPass: queued.pending,
    pendingFieldHandoff,
  };
}
