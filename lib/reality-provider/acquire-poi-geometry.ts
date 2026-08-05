/**
 * Acquire poi_geometry — OSM Nominatim polygon → Reality footprint.
 * Hangul miss → Wikipedia canonical title → Nominatim (not landmark seed).
 */

import { nominatimGeocodeWithGeometry } from "@/lib/location-engine/providers/nominatim";
import { wikipediaPlaceSummary } from "@/lib/location-engine/providers/wikipedia-place";
import { acquireCachedPoiGeometry } from "@/lib/reality-provider/cached-poi-geometry";
import {
  normalizePoiFootprint,
  type RealityPoiGeometryObject,
} from "@/lib/reality-provider/normalize-poi-geometry";
import type {
  RealityNeed,
  RealityProviderId,
} from "@/lib/reality-provider/types";

export type AcquirePoiGeometryResult =
  | { readonly ok: true; readonly object: RealityPoiGeometryObject }
  | { readonly ok: false; readonly reasonKo: string };

async function nominatimFootprint(
  query: string,
  geoId: string | null | undefined,
): Promise<RealityPoiGeometryObject | null> {
  const hit = await nominatimGeocodeWithGeometry(query);
  if (!hit) return null;
  return normalizePoiFootprint({
    geoId: geoId?.trim() || `geo:osm:${hit.placeId}`,
    labelKo: hit.labelKo,
    lat: hit.lat,
    lng: hit.lng,
    geometry: hit.geometry,
    boundingbox: hit.boundingbox,
    providerId: "osm",
    osmType: hit.osmType,
    osmId: hit.osmId,
  });
}

/**
 * Acquire place footprint for Need. OSM first; Wikipedia title bridge; cached seed fallthrough.
 */
export async function acquirePoiGeometry(input: {
  readonly need: RealityNeed;
  readonly providerId: RealityProviderId;
}): Promise<AcquirePoiGeometryResult> {
  const { need, providerId } = input;
  const query =
    need.placeQuery?.trim() ||
    need.utterance.trim() ||
    need.geoId?.trim() ||
    "";

  if (providerId === "cached_overlay") {
    const cached = acquireCachedPoiGeometry({
      query,
      geoId: need.geoId,
      labelKo: need.placeQuery,
    });
    if (!cached) {
      return { ok: false, reasonKo: "캐시 footprint 없음" };
    }
    return { ok: true, object: cached };
  }

  if (providerId !== "osm") {
    return { ok: false, reasonKo: `${providerId} geometry 미지원` };
  }

  if (query.length < 2) {
    return { ok: false, reasonKo: "장소 쿼리 없음" };
  }

  let object = await nominatimFootprint(query, need.geoId);
  if (!object) {
    const wiki = await wikipediaPlaceSummary(query);
    if (wiki?.titleKo && wiki.titleKo !== query) {
      object = await nominatimFootprint(wiki.titleKo, need.geoId);
    }
  }

  if (!object) {
    return { ok: false, reasonKo: "OSM Nominatim miss" };
  }

  return { ok: true, object };
}
