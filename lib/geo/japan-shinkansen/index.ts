/**
 * Japan Shinkansen overlay — public barrel (2D Workspace only).
 */

export {
  JAPAN_SHINKANSEN_BOUNDS,
  JAPAN_SHINKANSEN_GEOJSON_URL,
  JAPAN_SHINKANSEN_LINE_CATALOG,
  JAPAN_SHINKANSEN_LINE_IDS,
  getJapanShinkansenLineEntry,
  resolveJapanShinkansenLineIdFromText,
  type JapanShinkansenLineEntry,
  type JapanShinkansenLineId,
} from "@/lib/geo/japan-shinkansen/line-catalog";

export {
  resolveJapanShinkansenOverlayCommand,
  japanShinkansenOverlayStatusKo,
  tryApplyJapanShinkansenOverlayFromUtterance,
  type JapanShinkansenOverlayCommand,
} from "@/lib/geo/japan-shinkansen/resolve-shinkansen-overlay-command";

export {
  applyJapanShinkansenOverlayCommand,
  clearJapanShinkansenOverlayForTests,
  getJapanShinkansenVisibleLineIds,
  setJapanShinkansenVisibleLineIds,
  subscribeJapanShinkansenOverlay,
} from "@/lib/geo/japan-shinkansen/shinkansen-overlay-store";
