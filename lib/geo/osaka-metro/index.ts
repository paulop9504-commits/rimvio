/**
 * Osaka Metro overlay — public barrel (2D Workspace only).
 */

export {
  OSAKA_METRO_GEOJSON_URL,
  OSAKA_METRO_LINE_CATALOG,
  OSAKA_METRO_LINE_IDS,
  getOsakaMetroLineEntry,
  resolveOsakaMetroLineIdFromText,
  type OsakaMetroLineEntry,
  type OsakaMetroLineId,
} from "@/lib/geo/osaka-metro/line-catalog";

export {
  OSAKA_METRO_STATIONS,
  OSAKA_METRO_LINE_PATHS,
  stationsForVisibleLines,
  linePathMidpoint,
  type OsakaMetroStation,
} from "@/lib/geo/osaka-metro/station-catalog";

export {
  resolveOsakaMetroOverlayCommand,
  osakaMetroOverlayStatusKo,
  tryApplyOsakaMetroOverlayFromUtterance,
  type OsakaMetroOverlayCommand,
} from "@/lib/geo/osaka-metro/resolve-metro-overlay-command";

export {
  applyOsakaMetroOverlayCommand,
  clearOsakaMetroOverlayForTests,
  getOsakaMetroVisibleLineIds,
  setOsakaMetroVisibleLineIds,
  subscribeOsakaMetroOverlay,
} from "@/lib/geo/osaka-metro/metro-overlay-store";
