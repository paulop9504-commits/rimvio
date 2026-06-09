import type { GlobeMapTileStyle } from "@/lib/experience-graph/build-globe-map-tiles";

const UPSTREAM_URLS: Record<GlobeMapTileStyle, string> = {
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  voyager: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  light: "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
};

export function resolveGlobeTileUpstreamUrl(input: {
  z: number;
  x: number;
  y: number;
  style: GlobeMapTileStyle;
}): string | null {
  const template = UPSTREAM_URLS[input.style];
  if (!template) {
    return null;
  }
  const z = Math.max(0, Math.min(18, Math.floor(input.z)));
  const n = 2 ** z;
  const x = ((Math.floor(input.x) % n) + n) % n;
  const y = Math.max(0, Math.min(n - 1, Math.floor(input.y)));
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}
