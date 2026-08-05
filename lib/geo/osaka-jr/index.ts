/**
 * Osaka JR — public barrel (cached_overlay source for ADR-051).
 */

export {
  OSAKA_JR_BOUNDS,
  OSAKA_JR_GEOJSON_URL,
  OSAKA_JR_LINE_CATALOG,
  OSAKA_JR_LINE_IDS,
  getOsakaJrLineEntry,
  type OsakaJrLineEntry,
  type OsakaJrLineId,
} from "@/lib/geo/osaka-jr/line-catalog";

export {
  OSAKA_JR_STATIONS,
  type OsakaJrStation,
} from "@/lib/geo/osaka-jr/station-catalog";

export {
  clearOsakaJrOverlayForTests,
  getOsakaJrVisibleLineIds,
  hideAllOsakaJrLines,
  setOsakaJrVisibleLineIds,
  showAllOsakaJrLines,
  subscribeOsakaJrOverlay,
} from "@/lib/geo/osaka-jr/jr-overlay-store";
