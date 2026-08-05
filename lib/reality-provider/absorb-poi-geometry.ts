/**
 * Absorb place footprint after pin locate — Need → Provider → Acquire → Project.
 */

import { acquirePoiGeometry } from "@/lib/reality-provider/acquire-poi-geometry";
import { projectPoiGeometryAbsorb } from "@/lib/reality-provider/project-poi-geometry";
import { resolveRealityProvider } from "@/lib/reality-provider/resolve-provider";
import type { RealityNeed, RealityProviderId } from "@/lib/reality-provider/types";

export type AbsorbPoiGeometryResult = {
  readonly ok: boolean;
  readonly statusKo: string;
  readonly providerId: RealityProviderId | null;
  readonly geometryType: "Polygon" | "MultiPolygon" | null;
};

/**
 * Place locate follow-on: pull OSM polygon and project glow (not chat essay).
 */
export async function absorbPoiGeometryForPlace(input: {
  readonly contextEventId: string;
  readonly query: string;
  readonly labelKo: string;
  readonly geoId: string;
  readonly lat: number;
  readonly lng: number;
  readonly utterance?: string | null;
}): Promise<AbsorbPoiGeometryResult> {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return {
      ok: false,
      statusKo: "context 없음",
      providerId: null,
      geometryType: null,
    };
  }

  const need: RealityNeed = {
    needId: "poi_geometry",
    utterance: input.utterance?.trim() || `${input.labelKo} 위치`,
    placeQuery: input.query.trim() || input.labelKo,
    geoId: input.geoId,
    lat: input.lat,
    lng: input.lng,
    regionKo: null,
    operatorHint: null,
  };

  const resolution = resolveRealityProvider(need);
  let lastFail = "Geometry Acquire 실패";

  for (const candidate of resolution.candidates) {
    const acquired = await acquirePoiGeometry({
      need,
      providerId: candidate.providerId,
    });
    if (!acquired.ok) {
      lastFail = acquired.reasonKo;
      continue;
    }
    const projected = projectPoiGeometryAbsorb({
      need,
      object: acquired.object,
      contextEventId,
    });
    return {
      ok: true,
      statusKo: projected.statusKo,
      providerId: projected.providerId,
      geometryType: projected.geometryType,
    };
  }

  return {
    ok: false,
    statusKo: lastFail,
    providerId: resolution.selected?.providerId ?? null,
    geometryType: null,
  };
}
