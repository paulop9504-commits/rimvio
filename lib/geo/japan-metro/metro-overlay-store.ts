/**
 * Japan nationwide subway overlay visibility — 2D Workspace only.
 */

import {
  JAPAN_METRO_LINE_IDS,
  type JapanMetroLineId,
} from "@/lib/geo/japan-metro/line-catalog";
import type { JapanMetroOverlayCommand } from "@/lib/geo/japan-metro/resolve-metro-overlay-command";

const listeners = new Set<() => void>();
let visibleLineIds: readonly JapanMetroLineId[] = [];

function emit(): void {
  for (const l of listeners) l();
}

export function subscribeJapanMetroOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getJapanMetroVisibleLineIds(): readonly JapanMetroLineId[] {
  return visibleLineIds;
}

export function setJapanMetroVisibleLineIds(
  ids: readonly JapanMetroLineId[],
): void {
  const next = JAPAN_METRO_LINE_IDS.filter((id) => ids.includes(id));
  if (
    next.length === visibleLineIds.length &&
    next.every((id, i) => id === visibleLineIds[i])
  ) {
    return;
  }
  visibleLineIds = next;
  emit();
}

export function applyJapanMetroOverlayCommand(
  cmd: JapanMetroOverlayCommand,
): readonly JapanMetroLineId[] {
  if (cmd.op === "show_all") {
    visibleLineIds = [...JAPAN_METRO_LINE_IDS];
    emit();
    return visibleLineIds;
  }
  if (cmd.op === "hide_all") {
    visibleLineIds = [];
    emit();
    return visibleLineIds;
  }
  if (cmd.op === "show_set") {
    visibleLineIds = JAPAN_METRO_LINE_IDS.filter((id) =>
      cmd.lineIds.includes(id),
    );
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

export function clearJapanMetroOverlayForTests(): void {
  visibleLineIds = [];
  emit();
}
