/**
 * Osaka JR overlay visibility — Projection of Reality Provider absorb (not Commit).
 */

import {
  OSAKA_JR_LINE_IDS,
  type OsakaJrLineId,
} from "@/lib/geo/osaka-jr/line-catalog";

const listeners = new Set<() => void>();
let visibleLineIds: readonly OsakaJrLineId[] = [];

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeOsakaJrOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOsakaJrVisibleLineIds(): readonly OsakaJrLineId[] {
  return visibleLineIds;
}

export function setOsakaJrVisibleLineIds(
  ids: readonly OsakaJrLineId[],
): void {
  const next = OSAKA_JR_LINE_IDS.filter((id) => ids.includes(id));
  if (
    next.length === visibleLineIds.length &&
    next.every((id, i) => id === visibleLineIds[i])
  ) {
    return;
  }
  visibleLineIds = next;
  emit();
}

export function showAllOsakaJrLines(): readonly OsakaJrLineId[] {
  visibleLineIds = [...OSAKA_JR_LINE_IDS];
  emit();
  return visibleLineIds;
}

export function hideAllOsakaJrLines(): readonly OsakaJrLineId[] {
  visibleLineIds = [];
  emit();
  return visibleLineIds;
}

export function clearOsakaJrOverlayForTests(): void {
  visibleLineIds = [];
  emit();
}
