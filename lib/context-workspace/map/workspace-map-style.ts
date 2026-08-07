/**
 * Workspace MapLibre basemap — same-origin Voyager raster via /api/globe/tile.
 * Avoid third-party CDN (openfreemap) blank-canvas failures on mobile Safari.
 */

export type WorkspaceMapStyleSpec = {
  readonly version: 8;
  readonly name: string;
  readonly glyphs?: string;
  readonly sources: Readonly<Record<string, unknown>>;
  readonly layers: readonly Record<string, unknown>[];
};

export function buildWorkspaceRasterStyle(): WorkspaceMapStyleSpec {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://rimvio.com";
  const tileUrl = `${origin}/api/globe/tile?z={z}&x={x}&y={y}&style=voyager`;
  return {
    version: 8,
    name: "rimvio-workspace-voyager",
    sources: {
      rimvio_voyager: {
        type: "raster",
        tiles: [tileUrl],
        tileSize: 256,
        attribution: "© OpenStreetMap © CARTO",
        maxzoom: 18,
        minzoom: 0,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#f2f4f6" },
      },
      {
        id: "rimvio_voyager",
        type: "raster",
        source: "rimvio_voyager",
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-opacity": 1,
          "raster-fade-duration": 0,
        },
      },
    ],
  };
}

/** Prefer same-origin raster on coarse/narrow viewports; vector elsewhere with raster fallback. */
export function shouldPreferWorkspaceRasterBasemap(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return (
      window.matchMedia("(max-width: 900px)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    );
  } catch {
    return true;
  }
}
