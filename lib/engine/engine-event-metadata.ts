import type { RimvioEngineId } from "@/lib/engine/engine-types";

export const CONTEXT_ENGINE_EVENTS_META_KEY = "contextEngineEventsV1" as const;

export const RIMVIO_ENGINE_EVENT_KINDS = [
  "scout_complete",
  "scout_failed",
  /** Soft fail — quality gate thin/empty; coach may replan (never Commit). */
  "scout_insufficient",
  "main_selected",
  /** Ball to teammate — routes next soft turn; never Commits Reality. */
  "pass",
  /** Stronger pass after MAIN pin — assist into next engine prep. */
  "assist",
  /** Ball to Field FSM (Reality queue / trades) — human Commit still required. */
  "field_ready",
] as const;

export type RimvioEngineEventKind = (typeof RIMVIO_ENGINE_EVENT_KINDS)[number];

export type RimvioEngineEventV1 = {
  readonly id: string;
  readonly engineId: RimvioEngineId;
  readonly kind: RimvioEngineEventKind;
  readonly atIso: string;
  readonly executionNodeId: string | null;
  readonly payload: Record<string, unknown>;
};

export type RimvioEngineEventsWireV1 = {
  readonly version: 1;
  readonly events: readonly RimvioEngineEventV1[];
};

function asEngineEventsWire(value: unknown): RimvioEngineEventsWireV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<RimvioEngineEventsWireV1>;
  if (row.version !== 1 || !Array.isArray(row.events)) {
    return null;
  }
  return row as RimvioEngineEventsWireV1;
}

export function readEngineEventsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): readonly RimvioEngineEventV1[] {
  const wire = asEngineEventsWire(metadata?.[CONTEXT_ENGINE_EVENTS_META_KEY]);
  return wire?.events ?? [];
}

export function appendEngineEventToMetadata(input: {
  metadata?: Record<string, unknown> | null;
  engineId: RimvioEngineId;
  kind: RimvioEngineEventKind;
  executionNodeId?: string | null;
  payload?: Record<string, unknown>;
  now?: Date;
}): Record<string, unknown> {
  const next = { ...(input.metadata ?? {}) };
  const prior = readEngineEventsFromMetadata(next);
  const stamp = (input.now ?? new Date()).toISOString();
  const event: RimvioEngineEventV1 = {
    id: `eng-ev-${stamp}-${prior.length}`,
    engineId: input.engineId,
    kind: input.kind,
    atIso: stamp,
    executionNodeId: input.executionNodeId ?? null,
    payload: input.payload ?? {},
  };
  const wire: RimvioEngineEventsWireV1 = {
    version: 1,
    events: [...prior, event],
  };
  next[CONTEXT_ENGINE_EVENTS_META_KEY] = wire;
  return next;
}
