/**
 * Circle polygon GeoJSON for MapLibre fill/line (approx geodesic).
 */

export function createCirclePolygonGeoJSON(input: {
  readonly lat: number;
  readonly lng: number;
  readonly radiusMeters: number;
  readonly steps?: number;
  readonly properties?: Record<string, unknown>;
}): GeoJSON.FeatureCollection {
  const steps = Math.max(16, Math.min(96, input.steps ?? 64));
  const coords: [number, number][] = [];
  const latRad = (input.lat * Math.PI) / 180;
  const mPerDegLat = 110_540;
  const mPerDegLng = 111_320 * Math.cos(latRad);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const dLat = (input.radiusMeters * Math.cos(theta)) / mPerDegLat;
    const dLng = (input.radiusMeters * Math.sin(theta)) / mPerDegLng;
    coords.push([input.lng + dLng, input.lat + dLat]);
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: input.properties ?? {},
        geometry: {
          type: "Polygon",
          coordinates: [coords],
        },
      },
    ],
  };
}
