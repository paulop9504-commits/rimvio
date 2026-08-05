/**
 * Seed footprints for offline / fail-closed cached_overlay (ADR-051).
 * Live OSM Nominatim is preferred; these are coarse grounds only.
 */

import type { RealityPoiGeometryObject } from "@/lib/reality-provider/normalize-poi-geometry";

const OSAKA_CASTLE_GROUNDS: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [135.5218, 34.6852],
      [135.5308, 34.6852],
      [135.5308, 34.6908],
      [135.5218, 34.6908],
      [135.5218, 34.6852],
    ],
  ],
};

const GYEONGBOKGUNG_GROUNDS: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [126.9742, 37.5758],
      [126.9798, 37.5758],
      [126.9798, 37.5808],
      [126.9742, 37.5808],
      [126.9742, 37.5758],
    ],
  ],
};

type Seed = {
  readonly match: RegExp;
  readonly geoId: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly geometry: GeoJSON.Polygon;
};

const SEEDS: readonly Seed[] = [
  {
    match: /오사카\s*성|osaka\s*castle|大阪城|geo:jp:osaka:osaka-castle/iu,
    geoId: "geo:jp:osaka:osaka-castle",
    labelKo: "오사카성",
    lat: 34.6873,
    lng: 135.5262,
    geometry: OSAKA_CASTLE_GROUNDS,
  },
  {
    match: /경복궁|gyeongbokgung|geo:kr:seoul:gyeongbokgung/iu,
    geoId: "geo:kr:seoul:gyeongbokgung",
    labelKo: "경복궁",
    lat: 37.5796,
    lng: 126.977,
    geometry: GYEONGBOKGUNG_GROUNDS,
  },
];

/**
 * Match place query / geoId against cached footprints.
 */
export function acquireCachedPoiGeometry(input: {
  readonly query: string;
  readonly geoId?: string | null;
  readonly labelKo?: string | null;
}): RealityPoiGeometryObject | null {
  const hay = `${input.geoId ?? ""} ${input.query} ${input.labelKo ?? ""}`;
  const seed = SEEDS.find((s) => s.match.test(hay));
  if (!seed) return null;
  return {
    geoId: seed.geoId,
    labelKo: input.labelKo?.trim() || seed.labelKo,
    lat: seed.lat,
    lng: seed.lng,
    geometry: seed.geometry,
    providerId: "cached_overlay",
    osmType: null,
    osmId: null,
  };
}
