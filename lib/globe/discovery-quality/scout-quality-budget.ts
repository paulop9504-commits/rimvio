import type { RimvioEngineId } from "@/lib/engine/engine-types";
import {
  DEFAULT_SCOUT_QUALITY_MAX_ATTEMPTS,
} from "@/lib/globe/discovery-quality/evaluate-scout-quality-gate";

export const CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY =
  "contextScoutQualityBudgetV1" as const;

export type ScoutQualityBudgetEngineRow = {
  readonly attemptsUsed: number;
  readonly maxAttempts: number;
  readonly lastVerdict?: string;
  readonly updatedAtIso: string;
};

export type ScoutQualityBudgetWireV1 = {
  readonly version: 1;
  readonly byEngine: Readonly<
    Partial<Record<RimvioEngineId, ScoutQualityBudgetEngineRow>>
  >;
};

function asWire(value: unknown): ScoutQualityBudgetWireV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ScoutQualityBudgetWireV1>;
  if (row.version !== 1 || !row.byEngine || typeof row.byEngine !== "object") {
    return null;
  }
  return row as ScoutQualityBudgetWireV1;
}

export function readScoutQualityBudget(
  metadata: Record<string, unknown> | null | undefined,
): ScoutQualityBudgetWireV1 {
  return (
    asWire(metadata?.[CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY]) ?? {
      version: 1,
      byEngine: {},
    }
  );
}

export function readScoutQualityAttemptsUsed(
  metadata: Record<string, unknown> | null | undefined,
  engineId: RimvioEngineId,
): number {
  return readScoutQualityBudget(metadata).byEngine[engineId]?.attemptsUsed ?? 0;
}

export function bumpScoutQualityAttempt(input: {
  metadata?: Record<string, unknown> | null;
  engineId: RimvioEngineId;
  verdict: string;
  maxAttempts?: number;
  now?: Date;
}): Record<string, unknown> {
  const prev = readScoutQualityBudget(input.metadata);
  const prior = prev.byEngine[input.engineId];
  const maxAttempts =
    input.maxAttempts ??
    prior?.maxAttempts ??
    DEFAULT_SCOUT_QUALITY_MAX_ATTEMPTS;
  const nextRow: ScoutQualityBudgetEngineRow = {
    attemptsUsed: (prior?.attemptsUsed ?? 0) + 1,
    maxAttempts,
    lastVerdict: input.verdict,
    updatedAtIso: (input.now ?? new Date()).toISOString(),
  };
  const wire: ScoutQualityBudgetWireV1 = {
    version: 1,
    byEngine: {
      ...prev.byEngine,
      [input.engineId]: nextRow,
    },
  };
  return {
    ...(input.metadata ?? {}),
    [CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY]: wire,
  };
}

/** Test helper — clear budget row for an engine. */
export function clearScoutQualityBudgetForEngine(input: {
  metadata?: Record<string, unknown> | null;
  engineId: RimvioEngineId;
}): Record<string, unknown> {
  const prev = readScoutQualityBudget(input.metadata);
  const byEngine = { ...prev.byEngine };
  delete byEngine[input.engineId];
  return {
    ...(input.metadata ?? {}),
    [CONTEXT_SCOUT_QUALITY_BUDGET_META_KEY]: {
      version: 1 as const,
      byEngine,
    },
  };
}
