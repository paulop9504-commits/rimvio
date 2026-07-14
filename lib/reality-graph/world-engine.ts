import {
  answerAdminDivisionQuestion,
  formatWorldGeoHierarchyEn,
  formatWorldGeoHierarchyKo,
} from "@/lib/reality-graph/answer-admin-division";
import {
  buildRealitySyncSlice,
  REALITY_SYNC_INTERVAL_MS,
} from "@/lib/reality-graph/reality-sync";
import {
  resolveWorldGeoById,
  resolveWorldGeoEntity,
  resolveWorldGeoNearCoords,
  walkHierarchyPath,
} from "@/lib/reality-graph/resolve-world-geo";
import type {
  RealityGraphResolveHit,
  RealitySyncSlice,
  WorldEngineId,
  WorldGeoEntityId,
} from "@/lib/reality-graph/types";
import { getWorldGeoNode, listWorldGeoChildren } from "@/lib/reality-graph/world-geo-seed";

/**
 * World Engine facade — Location / Geo / Map / GPS / … all read Reality Graph.
 * Does not Commit Reality. Does not write personal ontology.
 */
export const WORLD_ENGINE_IDS: readonly WorldEngineId[] = [
  "location",
  "geo",
  "map",
  "gps",
  "time",
  "weather",
  "transit",
  "event",
  "reality_sync",
  "entity_graph",
] as const;

export type WorldEngineLookupResult = {
  hit: RealityGraphResolveHit;
  hierarchyKo: string;
  hierarchyEn: string;
  sync: RealitySyncSlice | null;
};

export function worldEngineLookup(text: string): WorldEngineLookupResult | null {
  const hit = resolveWorldGeoEntity(text);
  if (!hit) {
    return null;
  }
  return {
    hit,
    hierarchyKo: formatWorldGeoHierarchyKo(hit),
    hierarchyEn: formatWorldGeoHierarchyEn(hit),
    sync: buildRealitySyncSlice({ geoId: hit.node.id }),
  };
}

export function worldEngineLookupCoords(
  lat: number,
  lng: number,
): WorldEngineLookupResult | null {
  const hit = resolveWorldGeoNearCoords(lat, lng);
  if (!hit) {
    return null;
  }
  return {
    hit,
    hierarchyKo: formatWorldGeoHierarchyKo(hit),
    hierarchyEn: formatWorldGeoHierarchyEn(hit),
    sync: buildRealitySyncSlice({ geoId: hit.node.id, gpsActive: true }),
  };
}

export {
  answerAdminDivisionQuestion,
  formatWorldGeoHierarchyKo,
  formatWorldGeoHierarchyEn,
  buildRealitySyncSlice,
  REALITY_SYNC_INTERVAL_MS,
  resolveWorldGeoEntity,
  resolveWorldGeoById,
  resolveWorldGeoNearCoords,
  walkHierarchyPath,
  getWorldGeoNode,
  listWorldGeoChildren,
};
export type { WorldGeoEntityId, RealityGraphResolveHit, RealitySyncSlice, WorldEngineId };

/** Async Location Engine — Preference: Reality Graph → registry → Nominatim. */
export {
  resolveLocationFromText,
  resolveLocationFromCoords,
  suggestLocationsFromText,
} from "@/lib/location-engine";
export type { LocationEntity, LocationResolveResult } from "@/lib/location-engine";
