/**
 * Osaka Metro overlay visibility — 2D Workspace projection state (not Commit).
 */

import {
  OSAKA_METRO_LINE_IDS,
  type OsakaMetroLineId,
} from "@/lib/geo/osaka-metro/line-catalog";
import type { OsakaMetroOverlayCommand } from "@/lib/geo/osaka-metro/resolve-metro-overlay-command";

const listeners = new Set<() => void>();
let visibleLineIds: readonly OsakaMetroLineId[] = [];

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeOsakaMetroOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOsakaMetroVisibleLineIds(): readonly OsakaMetroLineId[] {
  return visibleLineIds;
}

export function setOsakaMetroVisibleLineIds(
  ids: readonly OsakaMetroLineId[],
): void {
  const next = OSAKA_METRO_LINE_IDS.filter((id) => ids.includes(id));
  if (
    next.length === visibleLineIds.length &&
    next.every((id, i) => id === visibleLineIds[i])
  ) {
    return;
  }
  visibleLineIds = next;
  emit();
}

export function applyOsakaMetroOverlayCommand(
  cmd: OsakaMetroOverlayCommand,
): readonly OsakaMetroLineId[] {
  if (cmd.op === "show_all") {
    visibleLineIds = [...OSAKA_METRO_LINE_IDS];
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

export function clearOsakaMetroOverlayForTests(): void {
  visibleLineIds = [];
  emit();
}
