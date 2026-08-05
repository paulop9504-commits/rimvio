/**
 * Korea national rail overlay — public barrel (2D Workspace only).
 */

export {
  KOREA_RAIL_BOUNDS,
  KOREA_RAIL_GEOJSON_URL,
  KOREA_RAIL_LINE_CATALOG,
  KOREA_RAIL_LINE_IDS,
  getKoreaRailLineEntry,
  resolveKoreaRailLineIdFromText,
  type KoreaRailLineEntry,
  type KoreaRailLineId,
} from "@/lib/geo/korea-rail/line-catalog";

export {
  resolveKoreaRailOverlayCommand,
  koreaRailOverlayStatusKo,
  tryApplyKoreaRailOverlayFromUtterance,
  type KoreaRailOverlayCommand,
} from "@/lib/geo/korea-rail/resolve-rail-overlay-command";

export {
  applyKoreaRailOverlayCommand,
  clearKoreaRailOverlayForTests,
  getKoreaRailVisibleLineIds,
  setKoreaRailVisibleLineIds,
  subscribeKoreaRailOverlay,
} from "@/lib/geo/korea-rail/rail-overlay-store";
