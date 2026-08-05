/**
 * Normalize OSM / Nominatim geometry → Reality Object footprint IR.
 */

export type RealityPoiGeometryObject = {
  readonly geoId: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  readonly providerId: "osm" | "cached_overlay";
  readonly osmType: string | null;
  readonly osmId: string | null;
};

/** south, north, west, east → closed Polygon ring (lng, lat). */
export function boundingBoxToPolygon(
  bbox: readonly [number, number, number, number],
): GeoJSON.Polygon {
  const [south, north, west, east] = bbox;
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

export function isAreaGeometry(
  g: GeoJSON.Geometry | null | undefined,
): g is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return g?.type === "Polygon" || g?.type === "MultiPolygon";
}

/**
 * Prefer Polygon/MultiPolygon; fall back to bounding box rectangle.
 */
export function normalizePoiFootprint(input: {
  readonly geoId: string;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly geometry: GeoJSON.Geometry | null;
  readonly boundingbox: readonly [number, number, number, number] | null;
  readonly providerId: "osm" | "cached_overlay";
  readonly osmType?: string | null;
  readonly osmId?: string | null;
}): RealityPoiGeometryObject | null {
  let geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon | null = null;
  if (isAreaGeometry(input.geometry)) {
    geometry = input.geometry;
  } else if (input.boundingbox) {
    geometry = boundingBoxToPolygon(input.boundingbox);
  }
  if (!geometry) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;

  return {
    geoId: input.geoId,
    labelKo: input.labelKo,
    lat: input.lat,
    lng: input.lng,
    geometry,
    providerId: input.providerId,
    osmType: input.osmType ?? null,
    osmId: input.osmId ?? null,
  };
}
