import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { GLOBE_TILE_MAX_ZOOM } from "@/lib/globe/globe-tile-constants";

/** Slippy-map tile URL for globe.gl `globeTileEngineUrl`. */
export function buildGlobeTileEngineUrl(
  x: number,
  y: number,
  level: number,
  style: GlobeMapTileStyle = "satellite",
): string {
  const z = Math.max(0, Math.min(GLOBE_TILE_MAX_ZOOM, Math.floor(level)));
  const n = 2 ** z;
  const tx = ((Math.floor(x) % n) + n) % n;
  const ty = Math.max(0, Math.min(n - 1, Math.floor(y)));
  return `/api/globe/tile?z=${z}&x=${tx}&y=${ty}&style=${style}`;
}

/**
 * Toss globe uses CARTO Voyager at every zoom — green land, blue ocean, road hierarchy.
 * (Light tiles are too pale for overview; Voyager matches Google Maps coloring.)
 */
export function resolveGlobeTileStyleForLevel(_level: number): GlobeMapTileStyle {
  return "voyager";
}

export function globeTileEngineUrl(x: number, y: number, level: number): string {
  return buildGlobeTileEngineUrl(x, y, level, resolveGlobeTileStyleForLevel(level));
}
