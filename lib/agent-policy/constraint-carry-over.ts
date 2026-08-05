/**
 * P1 · Constraint Carry-over Gate
 * Not all context inherits equally — Target stack vs destination change vs deixis.
 *
 * Policy (locked):
 * - 「맛집도」Target stack → NEW Job + inheritSpatial (keep near)
 * - 「후쿠오카 맛집」destination change → NEW Job + drop near
 * - 「거기서 맛집」deixis → inherit near
 */

import {
  emptyConstraintMemory,
  mergeConstraintMemoryFromUtterance,
  type ConstraintMemoryBag,
} from "@/lib/agent-policy/constraint-memory";
import type { AgentJobTarget } from "@/lib/agent-policy/agent-job";

/** 「거기서 / 그곳 근처」 — conversational inherit of near is allowed. */
const LOCALE_DEIXIS_RE =
  /거기(?:서|에서|서\s*근처)?|그곳(?:에서|근처)?|여기(?:서|근처)?|같은\s*(?:역|곳|동네|근처)|그\s*근처/iu;

/**
 * 「맛집도 찾아줘」 — Target stack: new Job, keep Spatial from previous Job.
 * Distinct from destination pivots (「후쿠오카 맛집」).
 */
const TARGET_STACK_RE =
  /(?:맛집|호텔|숙소|카페|놀거리|관광|약국)도|(?:그리고|또)\s*(?:맛집|호텔|숙소|카페|놀거리)/iu;

/** Named city/region in utterance that should replace remembered near. */
const DESTINATION_PIVOT_RE =
  /후쿠오카|fukuoka|도쿄|tokyo|교토|kyoto|오사카|osaka|서울|부산|제주|나고야|삿포로|고베/iu;

export function isTargetStackUtterance(utterance: string): boolean {
  return TARGET_STACK_RE.test(utterance.trim());
}

export function isLocaleDeixisUtterance(utterance: string): boolean {
  return LOCALE_DEIXIS_RE.test(utterance.trim());
}

export type ConstraintCarryOverResult = {
  readonly bagForScout: ConstraintMemoryBag;
  readonly carriedNear: boolean;
  readonly droppedNear: boolean;
  readonly droppedStayType: boolean;
  readonly inheritedSpatialFromStack: boolean;
  readonly statusKo: string | null;
};

/**
 * Decide which remembered constraints may ride into this turn's scout.
 */
export function resolveConstraintCarryOver(input: {
  readonly utterance: string;
  readonly previousBag: ConstraintMemoryBag | null | undefined;
  readonly switchJob: boolean;
  readonly previousTarget?: AgentJobTarget | null;
  readonly nextTarget?: AgentJobTarget | null;
}): ConstraintCarryOverResult {
  const merged = mergeConstraintMemoryFromUtterance({
    prev: input.previousBag,
    utterance: input.utterance,
  });

  const text = input.utterance.trim();
  const deixis = isLocaleDeixisUtterance(text);
  const targetStack = isTargetStackUtterance(text);
  const destinationPivot = DESTINATION_PIVOT_RE.test(text);
  const targetChanged =
    Boolean(input.previousTarget) &&
    Boolean(input.nextTarget) &&
    input.previousTarget !== "mixed" &&
    input.nextTarget !== "mixed" &&
    input.previousTarget !== input.nextTarget;

  let nearLabelKo = merged.nearLabelKo;
  let stayType = merged.stayType;
  let droppedNear = false;
  let droppedStayType = false;
  let inheritedSpatialFromStack = false;

  // Explicit destination in this utterance wins over remembered near.
  if (destinationPivot) {
    const fromUtterance = mergeConstraintMemoryFromUtterance({
      prev: emptyConstraintMemory(),
      utterance: text,
    }).nearLabelKo;
    if (fromUtterance) {
      nearLabelKo = fromUtterance;
    } else if (input.previousBag?.nearLabelKo && input.switchJob) {
      nearLabelKo = null;
      droppedNear = true;
    }
  } else if (targetStack && input.previousBag?.nearLabelKo) {
    // 「맛집도」— NEW Job but inherit Spatial from Job A.
    nearLabelKo = input.previousBag.nearLabelKo;
    inheritedSpatialFromStack = true;
    droppedNear = false;
  } else if (input.switchJob && !deixis) {
    // New Job without stack / deixis → do not silently inherit near.
    const utteranceHasNear = /근처|주변|쪽|역\s*앞/iu.test(text);
    if (!utteranceHasNear && nearLabelKo) {
      nearLabelKo = null;
      droppedNear = true;
    }
  }

  // Target pivot lodging → eatery: stayType is stale lodging bias.
  if (targetChanged && input.nextTarget === "eatery" && stayType) {
    stayType = null;
    droppedStayType = true;
  }

  const bagForScout: ConstraintMemoryBag = {
    ...merged,
    nearLabelKo,
    stayType,
    updatedAtIso: new Date().toISOString(),
  };

  let statusKo: string | null = null;
  if (inheritedSpatialFromStack && nearLabelKo) {
    statusKo = `${nearLabelKo} 기준은 유지하고 대상만 바꿨어요`;
  } else if (droppedNear && input.previousBag?.nearLabelKo) {
    statusKo = `이전 위치(${input.previousBag.nearLabelKo})는 안 끌고 갔어요`;
  }

  return {
    bagForScout,
    carriedNear: Boolean(nearLabelKo) && !droppedNear,
    droppedNear,
    droppedStayType,
    inheritedSpatialFromStack,
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
