/**
 * Pick next surgical tool from field-level missing evidence.
 * Cursor pattern: missing:reviewCount → places_details (then rescore).
 */

import type { ResearchStrategyId } from "@/lib/research-engine/research-strategy";
import { reorderGapsForStrategy } from "@/lib/research-engine/research-strategy";
import {
  fieldGapsToAxisGaps,
  toolForMissingField,
  type ResearchFieldGap,
  type ResearchMissingField,
} from "@/lib/research-engine/tools/detect-research-missing-fields";
import type { ResearchToolId } from "@/lib/research-engine/tools/types";

export type PickMissingToolResult = {
  readonly field: ResearchMissingField;
  readonly missingKey: `missing:${ResearchMissingField}`;
  readonly toolId: ResearchToolId;
};

/**
 * First untried tool for remaining missing fields (strategy reorders axis priority).
 */
export function pickResearchToolForMissing(input: {
  missing: readonly ResearchFieldGap[];
  triedTools: ReadonlySet<ResearchToolId>;
  /** Field already attempted with its mapped tool — skip pairing. */
  triedFields?: ReadonlySet<ResearchMissingField>;
  hasCoords: boolean;
  hasAnchor: boolean;
  strategy?: ResearchStrategyId;
}): PickMissingToolResult | null {
  if (input.missing.length === 0) return null;

  const axisOrdered = input.strategy
    ? reorderGapsForStrategy(
        fieldGapsToAxisGaps(input.missing),
        input.strategy,
      )
    : fieldGapsToAxisGaps(input.missing);

  const fieldsByAxis = new Map<string, ResearchFieldGap[]>();
  for (const m of input.missing) {
    const list = fieldsByAxis.get(m.axisId) ?? [];
    list.push(m);
    fieldsByAxis.set(m.axisId, list);
  }

  const ordered: ResearchFieldGap[] = [];
  for (const axis of axisOrdered) {
    for (const f of fieldsByAxis.get(axis.axisId) ?? []) {
      ordered.push(f);
    }
  }
  // Any fields not covered (shouldn't happen) — append.
  for (const m of input.missing) {
    if (!ordered.some((o) => o.field === m.field)) {
      ordered.push(m);
    }
  }

  for (const gap of ordered) {
    if (input.triedFields?.has(gap.field)) continue;
    const toolId = toolForMissingField({
      field: gap.field,
      hasCoords: input.hasCoords,
      hasAnchor: input.hasAnchor,
    });
    if (input.triedTools.has(toolId)) continue;
    return {
      field: gap.field,
      missingKey: gap.missingKey,
      toolId,
    };
  }
  return null;
}
