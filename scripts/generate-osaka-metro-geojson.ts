/**
 * Generate public/geo/osaka_metro.geojson from ordered station paths.
 * Usage: npx tsx scripts/generate-osaka-metro-geojson.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  OSAKA_METRO_LINE_CATALOG,
  OSAKA_METRO_LINE_IDS,
} from "../lib/geo/osaka-metro/line-catalog";
import {
  OSAKA_METRO_LINE_PATHS,
  OSAKA_METRO_STATION_BY_ID,
} from "../lib/geo/osaka-metro/station-catalog";

const features = OSAKA_METRO_LINE_IDS.map((lineId) => {
  const entry = OSAKA_METRO_LINE_CATALOG.find((e) => e.id === lineId)!;
  const path = OSAKA_METRO_LINE_PATHS[lineId];
  const coordinates = path.map((sid) => {
    const s = OSAKA_METRO_STATION_BY_ID[sid];
    if (!s) throw new Error(`missing station ${sid} for ${lineId}`);
    return [s.lng, s.lat] as [number, number];
  });
  if (coordinates.length < 2) {
    throw new Error(`line ${lineId} needs ≥2 stations`);
  }
  return {
    type: "Feature" as const,
    properties: {
      lineId,
      nameKo: entry.labelKo,
      color: entry.color,
    },
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };
});

const fc = {
  type: "FeatureCollection" as const,
  name: "osaka_metro",
  attribution:
    "Osaka Metro / JR Yumesaki corridors from curated station WGS84 (Workspace preview). Refresh via scripts/generate-osaka-metro-geojson.ts.",
  features,
};

const out = join(process.cwd(), "public/geo/osaka_metro.geojson");
writeFileSync(out, `${JSON.stringify(fc, null, 2)}\n`, "utf8");
console.log(`wrote ${features.length} lines · ${out}`);
