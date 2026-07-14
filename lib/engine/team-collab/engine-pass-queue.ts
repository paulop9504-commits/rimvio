import type { RimvioEngineId } from "@/lib/engine/engine-types";
import { resolveEngineHandoffSeed } from "@/lib/context-execution/build-plan-step-handoff";
import { resolveDefaultPassReceiver } from "@/lib/engine/team-collab/default-pass-graph";

export const CONTEXT_ENGINE_PASS_QUEUE_META_KEY =
  "contextEnginePassQueueV1" as const;

export type EngineTeamPassReason = "pass" | "assist";

export type EngineTeamPassPendingV1 = {
  readonly fromEngineId: RimvioEngineId;
  readonly toEngineId: RimvioEngineId;
  readonly seedUtterance: string;
  readonly hintKo: string;
  readonly reason: EngineTeamPassReason;
  readonly atIso: string;
};

export type EngineTeamPassQueueWireV1 = {
  readonly version: 1;
  readonly pending: EngineTeamPassPendingV1 | null;
};

function asPassQueueWire(value: unknown): EngineTeamPassQueueWireV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<EngineTeamPassQueueWireV1>;
  if (row.version !== 1) {
    return null;
  }
  return row as EngineTeamPassQueueWireV1;
}

export function readEnginePassQueueFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): EngineTeamPassQueueWireV1 {
  return (
    asPassQueueWire(metadata?.[CONTEXT_ENGINE_PASS_QUEUE_META_KEY]) ?? {
      version: 1,
      pending: null,
    }
  );
}

export function readPendingEnginePass(
  metadata: Record<string, unknown> | null | undefined,
): EngineTeamPassPendingV1 | null {
  return readEnginePassQueueFromMetadata(metadata).pending;
}

export function writeEnginePassQueueToMetadata(input: {
  metadata?: Record<string, unknown> | null;
  pending: EngineTeamPassPendingV1 | null;
}): Record<string, unknown> {
  const next = { ...(input.metadata ?? {}) };
  const wire: EngineTeamPassQueueWireV1 = {
    version: 1,
    pending: input.pending,
  };
  next[CONTEXT_ENGINE_PASS_QUEUE_META_KEY] = wire;
  return next;
}

export function clearPendingEnginePass(
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> {
  return writeEnginePassQueueToMetadata({ metadata, pending: null });
}

/**
 * Pure — after a successful lifecycle touch, queue the next teammate.
 * Does not Commit Reality; only schedules who may receive the next soft turn.
 */
export function queueEngineTeamPassAfterTouch(input: {
  metadata?: Record<string, unknown> | null;
  fromEngineId: RimvioEngineId;
  /** Prefer plan-scheduled receiver; else default formation. */
  toEngineId?: RimvioEngineId | null;
  reason?: EngineTeamPassReason;
  now?: Date;
}): {
  metadata: Record<string, unknown>;
  pending: EngineTeamPassPendingV1 | null;
} {
  const toEngineId =
    input.toEngineId ?? resolveDefaultPassReceiver(input.fromEngineId);
  if (!toEngineId || toEngineId === input.fromEngineId) {
    return {
      metadata: { ...(input.metadata ?? {}) },
      pending: null,
    };
  }
  const seed = resolveEngineHandoffSeed(toEngineId);
  const pending: EngineTeamPassPendingV1 = {
    fromEngineId: input.fromEngineId,
    toEngineId,
    seedUtterance: seed?.seedUtterance ?? "이어서 준비해줘",
    hintKo: seed?.hintKo ?? "다음 엔진으로 패스할까요?",
    reason: input.reason ?? "pass",
    atIso: (input.now ?? new Date()).toISOString(),
  };
  return {
    metadata: writeEnginePassQueueToMetadata({
      metadata: input.metadata,
      pending,
    }),
    pending,
  };
}
