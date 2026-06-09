import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";

/** Slippy-map tile URL for globe.gl `globeTileEngineUrl`. */
export function buildGlobeTileEngineUrl(
  x: number,
  y: number,
  level: number,
  style: GlobeMapTileStyle = "satellite",
): string {
  const z = Math.max(0, Math.min(18, Math.floor(level)));
  const n = 2 ** z;
  const tx = ((Math.floor(x) % n) + n) % n;
  const ty = Math.max(0, Math.min(n - 1, Math.floor(y)));
  return `/api/globe/tile?z=${z}&x=${tx}&y=${ty}&style=${style}`;
}

/** Voyager labels for regional zoom; satellite for street-level detail. */
export function resolveGlobeTileStyleForLevel(level: number): GlobeMapTileStyle {
  return level <= 7 ? "voyager" : "satellite";
}

export function globeTileEngineUrl(x: number, y: number, level: number): string {
  return buildGlobeTileEngineUrl(x, y, level, resolveGlobeTileStyleForLevel(level));
}
