"use client";

import { applyEngineTurnToExecutionPlanMetadata } from "@/lib/context-execution/apply-engine-turn-to-plan";
import { appendEngineEventToMetadata } from "@/lib/engine/engine-event-metadata";
import type { RimvioEngineEventKind } from "@/lib/engine/engine-event-metadata";
import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export function recordEngineEventClient(input: {
  contextEventId: string;
  engineId: RimvioEngineId;
  kind: RimvioEngineEventKind;
  executionNodeId?: string | null;
  payload?: Record<string, unknown>;
  lastError?: string | null;
}): void {
  const event = findLifeEventCandidate(input.contextEventId);
  if (!event) {
    return;
  }

  let metadata = appendEngineEventToMetadata({
    metadata: event.metadata ?? {},
    engineId: input.engineId,
    kind: input.kind,
    executionNodeId: input.executionNodeId,
    payload: input.payload,
  });

  const lastError =
    input.lastError ??
    (typeof input.payload?.error === "string" ? input.payload.error : null);

  const planApply = applyEngineTurnToExecutionPlanMetadata({
    metadata,
    engineId: input.engineId,
    kind: input.kind,
    executionNodeId: input.executionNodeId,
    lastError,
  });
  metadata = planApply.metadata;

  commitEventUpsert({
    ...event,
    metadata,
    updatedAt: new Date().toISOString(),
  });
}
