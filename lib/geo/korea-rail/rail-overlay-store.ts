/**
 * Korea national rail overlay visibility — 2D Workspace projection (not Commit).
 */

import {
  KOREA_RAIL_LINE_IDS,
  type KoreaRailLineId,
} from "@/lib/geo/korea-rail/line-catalog";
import type { KoreaRailOverlayCommand } from "@/lib/geo/korea-rail/resolve-rail-overlay-command";

const listeners = new Set<() => void>();
let visibleLineIds: readonly KoreaRailLineId[] = [];

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeKoreaRailOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getKoreaRailVisibleLineIds(): readonly KoreaRailLineId[] {
  return visibleLineIds;
}

export function setKoreaRailVisibleLineIds(
  ids: readonly KoreaRailLineId[],
): void {
  const next = KOREA_RAIL_LINE_IDS.filter((id) => ids.includes(id));
  if (
    next.length === visibleLineIds.length &&
    next.every((id, i) => id === visibleLineIds[i])
  ) {
    return;
  }
  visibleLineIds = next;
  emit();
}

export function applyKoreaRailOverlayCommand(
  cmd: KoreaRailOverlayCommand,
): readonly KoreaRailLineId[] {
  if (cmd.op === "show_all") {
    visibleLineIds = [...KOREA_RAIL_LINE_IDS];
    emit();
    return visibleLineIds;
  }
  if (cmd.op === "hide_all") {
    visibleLineIds = [];
    emit();
    return visibleLineIds;
  }
  if (cmd.op === "show") {
    if (!visibleLineIds.includes(cmd.lineId)) {
      visibleLineIds = [...visibleLineIds, cmd.lineId];
      emit();
    }
    return visibleLineIds;
  }
  visibleLineIds = visibleLineIds.filter((id) => id !== cmd.lineId);
  emit();
  return visibleLineIds;
}

export function clearKoreaRailOverlayForTests(): void {
  visibleLineIds = [];
  emit();
}
