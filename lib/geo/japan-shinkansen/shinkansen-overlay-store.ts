/**
 * Japan Shinkansen overlay visibility — 2D Workspace projection (not Commit).
 */

import {
  JAPAN_SHINKANSEN_LINE_IDS,
  type JapanShinkansenLineId,
} from "@/lib/geo/japan-shinkansen/line-catalog";
import type { JapanShinkansenOverlayCommand } from "@/lib/geo/japan-shinkansen/resolve-shinkansen-overlay-command";

const listeners = new Set<() => void>();
let visibleLineIds: readonly JapanShinkansenLineId[] = [];

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeJapanShinkansenOverlay(
  listener: () => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getJapanShinkansenVisibleLineIds(): readonly JapanShinkansenLineId[] {
  return visibleLineIds;
}

export function setJapanShinkansenVisibleLineIds(
  ids: readonly JapanShinkansenLineId[],
): void {
  const next = JAPAN_SHINKANSEN_LINE_IDS.filter((id) => ids.includes(id));
  if (
    next.length === visibleLineIds.length &&
    next.every((id, i) => id === visibleLineIds[i])
  ) {
    return;
  }
  visibleLineIds = next;
  emit();
}

export function applyJapanShinkansenOverlayCommand(
  cmd: JapanShinkansenOverlayCommand,
): readonly JapanShinkansenLineId[] {
  if (cmd.op === "show_all") {
    visibleLineIds = [...JAPAN_SHINKANSEN_LINE_IDS];
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

export function clearJapanShinkansenOverlayForTests(): void {
  visibleLineIds = [];
  emit();
}
