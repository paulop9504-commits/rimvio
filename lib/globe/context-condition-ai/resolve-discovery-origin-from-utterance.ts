/**
 * Prefer Station / Airport / Landmark entity over session lens / hotel POV.
 */
import type { DiscoverySearchOrigin } from "@/lib/globe/discovery-lens/types";
import { DISCOVERY_LENS_DEFAULT_RADIUS_M } from "@/lib/globe/discovery-lens/constants";
import { resolveSpatialTargetFromText } from "@/lib/globe/spatial/resolve-spatial-target-from-text";
import { normalizeScoutUtterance } from "@/lib/entity-resolver/normalize-scout-utterance";
import {
  findSpatialOriginEntity,
  resolveEntities,
  type EntityResolveResult,
} from "@/lib/entity-resolver";
import { getWorldGeoNode } from "@/lib/reality-graph/world-geo-seed";
import { parseUtteranceIntentSlots } from "@/lib/globe/context-condition-ai/utterance-intent-slots";

/** Capsule / lodging near a station needs ~2.5km — 1.2km was too tight for Namba. */
const STATION_NEAR_RADIUS_M = 2500;
const LANDMARK_NEAR_RADIUS_M = 2500;
const AIRPORT_NEAR_RADIUS_M = 5000;
/** 「싹 찾아」 / diffuse sweep around a named station. */
export const STATION_SWEEP_RADIUS_M = 5000;

function radiusForOrigin(entity: {
  kind: string;
  nearSearch?: boolean;
  semanticPath: readonly string[];
}): number {
  if (entity.kind === "Airport") {
    return AIRPORT_NEAR_RADIUS_M;
  }
  if (
    entity.semanticPath.some((node) => /Landmark|ThemePark|Museum/iu.test(node))
  ) {
    return LANDMARK_NEAR_RADIUS_M;
  }
  return STATION_NEAR_RADIUS_M;
}

/** When user names a station / airport / landmark, that wins as scout origin. */
export function resolveDiscoveryOriginFromUtterance(
  message: string,
  fallback: DiscoverySearchOrigin | null = null,
  entityBag?: EntityResolveResult | null,
): DiscoverySearchOrigin | null {
  const text = normalizeScoutUtterance(message);
  if (!text) {
    return fallback;
  }
  const resolved = entityBag ?? resolveEntities(text);
  const spatialEntity = findSpatialOriginEntity(resolved.entities);
  if (spatialEntity?.geoId) {
    const node = getWorldGeoNode(spatialEntity.geoId);
    if (node) {
      return {
        lat: node.centroid.lat,
        lng: node.centroid.lng,
        regionLabel: spatialEntity.label || node.labels.ko,
        radiusM: Math.max(
          fallback?.radiusM ?? 0,
          radiusForOrigin(spatialEntity),
        ),
        lensId: fallback?.lensId ?? null,
      };
    }
  }
  if (
    spatialEntity?.lat != null &&
    spatialEntity.lng != null &&
    Number.isFinite(spatialEntity.lat) &&
    Number.isFinite(spatialEntity.lng)
  ) {
    return {
      lat: spatialEntity.lat,
      lng: spatialEntity.lng,
      regionLabel: spatialEntity.label,
      radiusM: radiusForOrigin(spatialEntity),
      lensId: fallback?.lensId ?? null,
    };
  }

  const slots = parseUtteranceIntentSlots(text, resolved);
  const probe =
    slots.stationHint?.trim() ||
    (/[가-힣A-Za-z0-9]{2,16}역/u.exec(text)?.[0] ?? null) ||
    slots.areaHint?.trim() ||
    text;
  const spatial =
    resolveSpatialTargetFromText(probe) ?? resolveSpatialTargetFromText(text);
  if (!spatial) {
    return fallback;
  }
  const nearStation =
    Boolean(slots.stationHint) || /역|station|駅|공항|airport/iu.test(text);
  return {
    lat: spatial.lat,
    lng: spatial.lng,
    regionLabel: spatial.label,
    radiusM: nearStation
      ? Math.max(fallback?.radiusM ?? 0, STATION_NEAR_RADIUS_M)
      : (fallback?.radiusM ?? DISCOVERY_LENS_DEFAULT_RADIUS_M),
    lensId: fallback?.lensId ?? null,
  };
}
