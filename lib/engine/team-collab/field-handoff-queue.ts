import type { RimvioEngineId } from "@/lib/engine/engine-types";
import type { FieldDashboardTab } from "@/lib/nav/field-dashboard-types";

export const CONTEXT_FIELD_HANDOFF_META_KEY = "contextFieldHandoffV1" as const;

export type EngineFieldHandoffPendingV1 = {
  readonly fromEngineId: RimvioEngineId;
  readonly tab: FieldDashboardTab;
  readonly hintKo: string;
  readonly atIso: string;
};

export type EngineFieldHandoffWireV1 = {
  readonly version: 1;
  readonly pending: EngineFieldHandoffPendingV1 | null;
};

function asFieldHandoffWire(value: unknown): EngineFieldHandoffWireV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<EngineFieldHandoffWireV1>;
  if (row.version !== 1) {
    return null;
  }
  return row as EngineFieldHandoffWireV1;
}

export function readFieldHandoffFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): EngineFieldHandoffWireV1 {
  return (
    asFieldHandoffWire(metadata?.[CONTEXT_FIELD_HANDOFF_META_KEY]) ?? {
      version: 1,
      pending: null,
    }
  );
}

export function readPendingFieldHandoff(
  metadata: Record<string, unknown> | null | undefined,
): EngineFieldHandoffPendingV1 | null {
  return readFieldHandoffFromMetadata(metadata).pending;
}

export function writeFieldHandoffToMetadata(input: {
  metadata?: Record<string, unknown> | null;
  pending: EngineFieldHandoffPendingV1 | null;
}): Record<string, unknown> {
  const next = { ...(input.metadata ?? {}) };
  const wire: EngineFieldHandoffWireV1 = {
    version: 1,
    pending: input.pending,
  };
  next[CONTEXT_FIELD_HANDOFF_META_KEY] = wire;
  return next;
}

export function clearPendingFieldHandoff(
  metadata?: Record<string, unknown> | null,
): Record<string, unknown> {
  return writeFieldHandoffToMetadata({ metadata, pending: null });
}

/**
 * After MAIN pin — queue Field Reality Control as the next one-answer surface.
 * Does not Commit Reality; only schedules sheet ingress.
 */
export function queueEngineFieldHandoffAfterMain(input: {
  metadata?: Record<string, unknown> | null;
  fromEngineId: RimvioEngineId;
  tab?: FieldDashboardTab;
  hintKo?: string;
  now?: Date;
}): {
  metadata: Record<string, unknown>;
  pending: EngineFieldHandoffPendingV1;
} {
  const pending: EngineFieldHandoffPendingV1 = {
    fromEngineId: input.fromEngineId,
    tab: input.tab ?? "queue",
    hintKo: input.hintKo ?? "맞춤에서 확인할까요?",
    atIso: (input.now ?? new Date()).toISOString(),
  };
  return {
    metadata: writeFieldHandoffToMetadata({
      metadata: input.metadata,
      pending,
    }),
    pending,
  };
}

/** Budget exhausted / quality coach — same Field queue, human one-answer. */
export function queueEngineFieldHandoffForHumanDecision(input: {
  metadata?: Record<string, unknown> | null;
  fromEngineId: RimvioEngineId;
  tab?: FieldDashboardTab;
  now?: Date;
}): {
  metadata: Record<string, unknown>;
  pending: EngineFieldHandoffPendingV1;
} {
  return queueEngineFieldHandoffAfterMain({
    ...input,
    hintKo: "후보가 약해요 — 맞춤에서 직접 고를까요?",
  });
}
