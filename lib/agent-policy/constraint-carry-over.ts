/**
 * P1 · Constraint Carry-over — applies per-field inheritance policy (judgment only).
 */

import {
  emptyConstraintMemory,
  mergeConstraintMemoryFromUtterance,
  type ConstraintMemoryBag,
} from "@/lib/agent-policy/constraint-memory";
import type { AgentJobTarget } from "@/lib/agent-policy/agent-job";
import {
  planConstraintInheritance,
  type ConstraintInheritDecision,
} from "@/lib/agent-policy/constraint-inheritance-policy";

export {
  isLocaleDeixisUtterance,
  isTargetStackUtterance,
  isDestinationPivotUtterance,
} from "@/lib/agent-policy/constraint-inheritance-policy";

export type ConstraintCarryOverResult = {
  readonly bagForScout: ConstraintMemoryBag;
  readonly carriedNear: boolean;
  readonly droppedNear: boolean;
  readonly droppedStayType: boolean;
  readonly inheritedSpatialFromStack: boolean;
  readonly decisions: readonly ConstraintInheritDecision[];
  readonly statusKo: string | null;
};

function applyFieldOp(input: {
  readonly op: "keep" | "drop" | "from_utterance";
  readonly previous: string | number | null;
  readonly fromUtterance: string | number | null;
}): string | number | null {
  if (input.op === "drop") return null;
  if (input.op === "from_utterance") {
    return input.fromUtterance ?? input.previous;
  }
  return input.previous;
}

/**
 * Decide which remembered constraints may ride into this turn's scout.
 * Does not write Workspace — Agent Loop commits the bag.
 */
export function resolveConstraintCarryOver(input: {
  readonly utterance: string;
  readonly previousBag: ConstraintMemoryBag | null | undefined;
  readonly switchJob: boolean;
  readonly previousTarget?: AgentJobTarget | null;
  readonly nextTarget?: AgentJobTarget | null;
}): ConstraintCarryOverResult {
  const prev = input.previousBag ?? emptyConstraintMemory();
  const fromUtt = mergeConstraintMemoryFromUtterance({
    prev: emptyConstraintMemory(),
    utterance: input.utterance,
  });
  const merged = mergeConstraintMemoryFromUtterance({
    prev,
    utterance: input.utterance,
  });

  const decisions = planConstraintInheritance({
    utterance: input.utterance,
    switchJob: input.switchJob,
    previousTarget: input.previousTarget,
    nextTarget: input.nextTarget,
    hasPreviousNear: Boolean(prev.nearLabelKo),
  });

  const byField = new Map(decisions.map((d) => [d.field, d]));

  const nearOp = byField.get("near")?.op ?? "keep";
  const stayOp = byField.get("stayType")?.op ?? "from_utterance";
  const budgetOp = byField.get("budget")?.op ?? "keep";
  const ratingOp = byField.get("minRating")?.op ?? "keep";
  const keepTopNOp = byField.get("keepTopN")?.op ?? "keep";
  const sortByOp = byField.get("sortBy")?.op ?? "keep";

  const nearLabelKo = applyFieldOp({
    op: nearOp,
    previous: prev.nearLabelKo,
    fromUtterance: fromUtt.nearLabelKo ?? merged.nearLabelKo,
  }) as string | null;

  const stayType = applyFieldOp({
    op: stayOp,
    previous: prev.stayType,
    fromUtterance: fromUtt.stayType ?? merged.stayType,
  }) as string | null;

  const maxNightlyPriceKrw = applyFieldOp({
    op: budgetOp,
    previous: prev.maxNightlyPriceKrw,
    fromUtterance: fromUtt.maxNightlyPriceKrw,
  }) as number | null;

  const maxPriceBand = applyFieldOp({
    op: budgetOp,
    previous: prev.maxPriceBand,
    fromUtterance: fromUtt.maxPriceBand,
  }) as number | null;

  const minRating = applyFieldOp({
    op: ratingOp,
    previous: prev.minRating,
    fromUtterance: fromUtt.minRating,
  }) as number | null;

  const keepTopN = applyFieldOp({
    op: keepTopNOp,
    previous: prev.keepTopN,
    fromUtterance: fromUtt.keepTopN,
  }) as number | null;

  const sortBy = applyFieldOp({
    op: sortByOp,
    previous: prev.sortBy,
    fromUtterance: fromUtt.sortBy,
  }) as ConstraintMemoryBag["sortBy"];

  const droppedNear = nearOp === "drop" && Boolean(prev.nearLabelKo);
  const droppedStayType = stayOp === "drop" && Boolean(prev.stayType);
  const inheritedSpatialFromStack =
    byField.get("near")?.reason === "target_stack_keeps_spatial";

  const bagForScout: ConstraintMemoryBag = {
    maxNightlyPriceKrw,
    maxPriceBand,
    nearLabelKo,
    stayType,
    minRating,
    keepTopN,
    sortBy,
    updatedAtIso: new Date().toISOString(),
  };

  let statusKo: string | null = null;
  if (inheritedSpatialFromStack && nearLabelKo) {
    statusKo = `${nearLabelKo} 기준은 유지하고 대상만 바꿨어요`;
  } else if (droppedNear && prev.nearLabelKo) {
    statusKo = `이전 위치(${prev.nearLabelKo})는 안 끌고 갔어요`;
  }

  return {
    bagForScout,
    carriedNear: Boolean(nearLabelKo) && !droppedNear,
    droppedNear,
    droppedStayType,
    inheritedSpatialFromStack,
    decisions,
    statusKo,
  };
}

export function clearJobLocalConstraints(
  bag: ConstraintMemoryBag | null | undefined,
): ConstraintMemoryBag {
  const base = bag ?? emptyConstraintMemory();
  return {
    ...base,
    nearLabelKo: null,
    stayType: null,
    updatedAtIso: new Date().toISOString(),
  };
}
