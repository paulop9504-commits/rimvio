/**
 * Japan nationwide subway overlay — public barrel (2D Workspace only).
 */

export {
  JAPAN_METRO_BOUNDS,
  JAPAN_METRO_CITY_GROUPS,
  JAPAN_METRO_GEOJSON_URL,
  JAPAN_METRO_LINE_CATALOG,
  JAPAN_METRO_LINE_IDS,
  getJapanMetroLineEntry,
  resolveJapanMetroCityLineIds,
  resolveJapanMetroLineIdFromText,
  type JapanMetroLineEntry,
  type JapanMetroLineId,
} from "@/lib/geo/japan-metro/line-catalog";

export {
  resolveJapanMetroOverlayCommand,
  japanMetroOverlayStatusKo,
  tryApplyJapanMetroOverlayFromUtterance,
  type JapanMetroOverlayCommand,
} from "@/lib/geo/japan-metro/resolve-metro-overlay-command";

export {
  applyJapanMetroOverlayCommand,
  clearJapanMetroOverlayForTests,
  getJapanMetroVisibleLineIds,
  setJapanMetroVisibleLineIds,
  subscribeJapanMetroOverlay,
} from "@/lib/geo/japan-metro/metro-overlay-store";
