/**
 * Fallback raster tile URLs when CARTO voyager/light returns 429.
 * Prefer OSM.org standard map — separate quota from basemaps.cartocdn.
 */

import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";
import { GLOBE_TILE_MAX_ZOOM } from "@/lib/globe/globe-tile-constants";

const OSM_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const CARTO_POSITRON =
  "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png";
const SUBS = ["a", "b", "c", "d"] as const;

function fill(
  template: string,
  z: number,
  x: number,
  y: number,
  subdomain: string,
): string {
  return template
    .replace("{s}", subdomain)
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

export function resolveGlobeTileFallbackUrls(input: {
  z: number;
  x: number;
  y: number;
  style: GlobeMapTileStyle;
}): string[] {
  if (input.style === "satellite") {
    return [];
  }
  const z = Math.max(0, Math.min(GLOBE_TILE_MAX_ZOOM, Math.floor(input.z)));
  const n = 2 ** z;
  const x = ((Math.floor(input.x) % n) + n) % n;
  const y = Math.max(0, Math.min(n - 1, Math.floor(input.y)));
  const sub = SUBS[(x + y + 1) % SUBS.length]!;
  // Alternate CARTO style first (often less hot than voyager), then OSM.
  return [
    fill(CARTO_POSITRON, z, x, y, sub),
    fill(OSM_TEMPLATE, z, x, y, ""),
  ];
}
