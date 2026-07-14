/**
 * Apply scout domain correction — filter active discovery batch in place.
 * Does not re-scout; humans pick the chip, Reality surface updates.
 */

import {
  buildScoutDomainCorrectionChips,
  type ScoutDomainCorrectionChipV1,
  type ScoutRecommendationKind,
} from "@/lib/globe/context-condition-ai/build-scout-domain-correction-chips";
import {
  readContextConditionLastBatch,
  writeContextConditionLastBatch,
  type ContextConditionLastBatchWire,
} from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import { readContextAgentComposeThread } from "@/lib/globe/assistant/context-agent-compose-thread-store";

function dominantKind(
  recommendations: readonly { kind: string }[],
): ScoutRecommendationKind | "mixed" {
  const counts = new Map<string, number>();
  for (const row of recommendations) {
    counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
  }
  const kinds = [...counts.keys()];
  if (kinds.length !== 1) {
    return "mixed";
  }
  const only = kinds[0];
  if (
    only === "lodging" ||
    only === "eatery" ||
    only === "activity" ||
    only === "amenity"
  ) {
    return only;
  }
  return "mixed";
}

function filterRecommendations(
  rows: NonNullable<ContextConditionLastBatchWire["recommendations"]>,
  chip: ScoutDomainCorrectionChipV1,
): NonNullable<ContextConditionLastBatchWire["recommendations"]> {
  if (chip.action === "keep_kind") {
    return rows.filter((row) => row.kind === chip.kind);
  }
  return rows.filter((row) => row.kind !== chip.kind);
}

export type ApplyScoutDomainCorrectionResult =
  | {
      ok: true;
      batch: ContextConditionLastBatchWire;
      chip: ScoutDomainCorrectionChipV1;
      summaryKo: string;
    }
  | { ok: false; reason: "missing_batch" | "empty_after_filter" | "unknown_chip" };

export function applyScoutDomainCorrection(input: {
  contextEventId: string;
  batchId: string;
  chipId: string;
  chips: readonly ScoutDomainCorrectionChipV1[];
  summaryForCount: (count: number, kind: ScoutRecommendationKind | "mixed") => string;
}): ApplyScoutDomainCorrectionResult {
  const chip = input.chips.find((row) => row.id === input.chipId);
  if (!chip) {
    return { ok: false, reason: "unknown_chip" };
  }
  const batch = readContextConditionLastBatch(input.contextEventId);
  if (!batch || batch.batchId !== input.batchId.trim()) {
    return { ok: false, reason: "missing_batch" };
  }
  const prior = batch.recommendations ?? [];
  const nextRows = filterRecommendations(prior, chip);
  if (nextRows.length === 0) {
    return { ok: false, reason: "empty_after_filter" };
  }
  const scoutKind = dominantKind(nextRows);
  const summaryKo = input.summaryForCount(nextRows.length, scoutKind);
  const next: ContextConditionLastBatchWire = {
    ...batch,
    count: nextRows.length,
    summaryKo,
    atIso: new Date().toISOString(),
    recommendations: nextRows,
    spec: batch.spec
      ? {
          ...batch.spec,
          resourceTypes:
            scoutKind === "lodging"
              ? ["hotel"]
              : scoutKind === "eatery"
                ? ["restaurant"]
                : scoutKind === "activity"
                  ? ["activity"]
                  : scoutKind === "amenity"
                    ? ["amenity"]
                    : batch.spec.resourceTypes,
        }
      : batch.spec,
  };
  writeContextConditionLastBatch(input.contextEventId, next);
  return { ok: true, batch: next, chip, summaryKo };
}

/** Rebuild correction chips for a batch (or empty when clean). */
export function resolveScoutDomainCorrectionChipsForBatch(
  batch: Pick<
    ContextConditionLastBatchWire,
    "triggerMessage" | "spec" | "recommendations"
  >,
  labels: {
    keepOnlyLabel: (focusLabel: string) => string;
    stripLabel: (focusLabel: string) => string;
  },
): readonly ScoutDomainCorrectionChipV1[] {
  return buildScoutDomainCorrectionChips({
    triggerMessage: batch.triggerMessage,
    resourceTypes: batch.spec?.resourceTypes,
    recommendations: batch.recommendations ?? [],
    keepOnlyLabel: labels.keepOnlyLabel,
    stripLabel: labels.stripLabel,
  });
}

export function findScoutFeedGateTurnId(input: {
  contextEventId: string;
  batchId: string;
}): string | null {
  const rows = readContextAgentComposeThread(input.contextEventId);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (
      row?.role === "assistant" &&
      row.kind === "scout_feed_gate" &&
      row.payload.batchId === input.batchId.trim()
    ) {
      return row.id;
    }
  }
  return null;
}
