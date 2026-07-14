/**
 * Normalize provider hits → Location Entity (`geo:*`).
 * Prefer Reality Graph seed; otherwise mint `geo:osm:{placeId}` bridge id.
 */

import type { NominatimHit } from "@/lib/location-engine/providers/nominatim";
import type {
  LocationEntity,
  LocationProviderId,
} from "@/lib/location-engine/types";
import {
  formatWorldGeoHierarchyEn,
  formatWorldGeoHierarchyKo,
} from "@/lib/reality-graph/answer-admin-division";
import {
  resolveWorldGeoEntity,
  resolveWorldGeoNearCoords,
} from "@/lib/reality-graph/resolve-world-geo";
import type { RealityGraphResolveHit } from "@/lib/reality-graph/types";

function hierarchyFromAdmin(hit: NominatimHit): {
  hierarchyKo: string;
  hierarchyEn: string;
} {
  const partsKo = [
    hit.admin.countryName,
    hit.admin.region,
    hit.admin.city,
    hit.admin.district,
    hit.admin.neighborhood,
  ].filter(Boolean) as string[];
  const uniqueKo = [...new Set(partsKo)];
  const hierarchyKo = uniqueKo.length > 0 ? uniqueKo.join(" → ") : hit.labelKo;
  const hierarchyEn = hit.displayName.includes(",")
    ? hit.displayName
        .split(",")
        .map((s) => s.trim())
        .reverse()
        .join(" → ")
    : hit.labelEn;
  return { hierarchyKo, hierarchyEn };
}

function entityFromGraphHit(
  hit: RealityGraphResolveHit,
  provider: LocationProviderId,
  coords?: { lat: number; lng: number },
): LocationEntity {
  return {
    id: hit.node.id,
    labelKo: hit.node.labels.ko,
    labelEn: hit.node.labels.en,
    lat: coords?.lat ?? hit.node.centroid.lat,
    lng: coords?.lng ?? hit.node.centroid.lng,
    formattedAddress: formatWorldGeoHierarchyEn(hit),
    admin: {
      countryCode:
        hit.ancestors.find((n) => n.kind === "country")?.id === "geo:jp"
          ? "JP"
          : hit.ancestors.find((n) => n.kind === "country")?.id === "geo:cn"
            ? "CN"
            : hit.ancestors.find((n) => n.kind === "country")?.id === "geo:kr"
              ? "KR"
              : null,
      countryName:
        hit.ancestors.find((n) => n.kind === "country")?.labels.ko ?? null,
      region:
        [...hit.ancestors, hit.node].find(
          (n) => n.kind === "prefecture" || n.kind === "metropolis",
        )?.labels.ko ?? null,
      city:
        hit.node.kind === "metropolis" || hit.node.kind === "city"
          ? hit.node.labels.ko
          : [...hit.ancestors].find((n) => n.kind === "city" || n.kind === "metropolis")
              ?.labels.ko ?? null,
      district:
        hit.node.kind === "ward" || hit.node.kind === "district"
          ? hit.node.labels.ko
          : null,
      neighborhood:
        hit.node.kind === "neighborhood" ? hit.node.labels.ko : null,
    },
    hierarchyKo: formatWorldGeoHierarchyKo(hit),
    hierarchyEn: formatWorldGeoHierarchyEn(hit),
    timezone: hit.node.ianaTimeZone,
    confidence: hit.confidence,
    provider,
    providerPlaceId: null,
  };
}

export function normalizeRealityGraphText(text: string): LocationEntity | null {
  const hit = resolveWorldGeoEntity(text);
  if (!hit) {
    return null;
  }
  return entityFromGraphHit(hit, "reality_graph");
}

export function normalizeRealityGraphCoords(
  lat: number,
  lng: number,
): LocationEntity | null {
  const hit = resolveWorldGeoNearCoords(lat, lng);
  if (!hit) {
    return null;
  }
  return entityFromGraphHit(hit, "reality_graph", { lat, lng });
}

/**
 * Nominatim → prefer graph snap by label/coords, else OSM bridge entity.
 */
export function normalizeNominatimHit(hit: NominatimHit): LocationEntity {
  const byLabel =
    resolveWorldGeoEntity(hit.labelKo) ||
    resolveWorldGeoEntity(hit.labelEn) ||
    resolveWorldGeoEntity(
      [hit.admin.city, hit.admin.district, hit.admin.neighborhood]
        .filter(Boolean)
        .join(" "),
    );
  if (byLabel && byLabel.confidence >= 0.75) {
    return {
      ...entityFromGraphHit(byLabel, "nominatim", {
        lat: hit.lat,
        lng: hit.lng,
      }),
      formattedAddress: hit.displayName,
      confidence: Math.max(byLabel.confidence, 0.85),
      providerPlaceId: hit.placeId,
    };
  }

  const byCoords = resolveWorldGeoNearCoords(hit.lat, hit.lng);
  if (byCoords && byCoords.confidence >= 0.7) {
    return {
      ...entityFromGraphHit(byCoords, "nominatim", {
        lat: hit.lat,
        lng: hit.lng,
      }),
      formattedAddress: hit.displayName,
      admin: {
        countryCode:
          hit.admin.countryCode ??
          (byCoords.node.id.startsWith("geo:jp")
            ? "JP"
            : byCoords.node.id.startsWith("geo:cn")
              ? "CN"
              : byCoords.node.id.startsWith("geo:kr")
                ? "KR"
                : null),
        countryName: hit.admin.countryName,
        region: hit.admin.region,
        city: hit.admin.city,
        district: hit.admin.district,
        neighborhood: hit.admin.neighborhood,
      },
      confidence: Math.max(byCoords.confidence, 0.8),
      providerPlaceId: hit.placeId,
    };
  }

  const { hierarchyKo, hierarchyEn } = hierarchyFromAdmin(hit);
  const osmKey = hit.osmId
    ? `${hit.osmType ?? "node"}-${hit.osmId}`
    : hit.placeId;
  return {
    id: `geo:osm:${osmKey}` as `geo:${string}`,
    labelKo: hit.labelKo,
    labelEn: hit.labelEn,
    lat: hit.lat,
    lng: hit.lng,
    formattedAddress: hit.displayName,
    admin: hit.admin,
    hierarchyKo,
    hierarchyEn,
    timezone: null,
    confidence: 0.78,
    provider: "nominatim",
    providerPlaceId: hit.placeId,
  };
}
