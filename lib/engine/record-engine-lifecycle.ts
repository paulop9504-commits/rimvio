import { primaryExecutionNodeForEngine } from "@/lib/engine/execution-graph-engine-bindings";
import type { RimvioEngineEventKind } from "@/lib/engine/engine-event-metadata";
import { recordEngineEventClient } from "@/lib/engine/record-engine-event-client";
import type { RimvioEngineId } from "@/lib/engine/engine-types";

export function recordEngineLifecycleClient(input: {
  contextEventId: string;
  engineId: RimvioEngineId;
  kind: RimvioEngineEventKind;
  payload?: Record<string, unknown>;
  executionNodeId?: string | null;
  lastError?: string | null;
}): void {
  recordEngineEventClient({
    contextEventId: input.contextEventId,
    engineId: input.engineId,
    kind: input.kind,
    executionNodeId:
      input.executionNodeId ?? primaryExecutionNodeForEngine(input.engineId),
    payload: input.payload,
    lastError: input.lastError,
  });
}

/** Scout returned empty / commit failed — block Execution Plan step + persist. */
export function recordEngineScoutFailureClient(input: {
  contextEventId: string;
  engineId: RimvioEngineId;
  lastError: string;
  executionNodeId?: string | null;
  payload?: Record<string, unknown>;
}): void {
  recordEngineEventClient({
    contextEventId: input.contextEventId,
    engineId: input.engineId,
    kind: "scout_failed",
    executionNodeId: input.executionNodeId,
    lastError: input.lastError,
    payload: {
      ...input.payload,
      error: input.lastError,
    },
  });
}