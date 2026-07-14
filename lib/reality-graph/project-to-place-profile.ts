import type { CanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { formatWorldGeoHierarchyKo } from "@/lib/reality-graph/answer-admin-division";
import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";
import type { WorldGeoEntityId } from "@/lib/reality-graph/types";

/**
 * Map Reality Graph hit → fields for CanonicalPlaceProfile / SpatialTarget.zoneId.
 */
export function projectWorldGeoToPlaceFields(text: string): {
  zoneId: WorldGeoEntityId;
  label: string;
  lat: number;
  lng: number;
  countryCode: "JP" | "CN" | "KR" | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  timezone: string | null;
  hierarchyKo: string;
  confidence: number;
} | null {
  const hit = resolveWorldGeoEntity(text);
  if (!hit) {
    return null;
  }

  const country = hit.ancestors.find((n) => n.kind === "country") ?? null;
  const region =
    [...hit.ancestors, hit.node].find(
      (n) => n.kind === "prefecture" || n.kind === "metropolis",
    ) ?? null;
  const city =
    hit.node.kind === "metropolis" || hit.node.kind === "city"
      ? hit.node
      : region;
  const district =
    hit.node.kind === "ward" || hit.node.kind === "district" ? hit.node : null;
  const neighborhood = hit.node.kind === "neighborhood" ? hit.node : null;

  return {
    zoneId: hit.node.id,
    label: hit.node.labels.ko,
    lat: hit.node.centroid.lat,
    lng: hit.node.centroid.lng,
    countryCode:
      country?.id === "geo:jp"
        ? "JP"
        : country?.id === "geo:cn"
          ? "CN"
          : country?.id === "geo:kr"
            ? "KR"
            : null,
    countryName: country?.labels.ko ?? null,
    region: region?.labels.ko ?? null,
    city: city?.labels.ko ?? null,
    district: district?.labels.ko ?? neighborhood?.labels.ko ?? null,
    neighborhood: neighborhood?.labels.ko ?? null,
    timezone: hit.node.ianaTimeZone,
    hierarchyKo: formatWorldGeoHierarchyKo(hit),
    confidence: hit.confidence,
  };
}

/** Patch an existing profile with Reality Graph hierarchy when resolvable. */
export function enrichCanonicalPlaceProfileFromRealityGraph(
  profile: CanonicalPlaceProfile,
  text: string,
): CanonicalPlaceProfile {
  const fields = projectWorldGeoToPlaceFields(text);
  if (!fields) {
    return profile;
  }
  return {
    ...profile,
    lat: fields.lat,
    lng: fields.lng,
    label: fields.label || profile.label,
    countryCode: fields.countryCode ?? profile.countryCode,
    countryName: fields.countryName ?? profile.countryName,
    region: fields.region ?? profile.region,
    city: fields.city ?? profile.city,
    district: fields.district ?? profile.district,
    neighborhood: fields.neighborhood ?? profile.neighborhood,
    timezone: fields.timezone ?? profile.timezone,
    confidence: Math.max(profile.confidence, fields.confidence),
    searchHints: {
      ...profile.searchHints,
      countryBias:
        fields.countryCode === "JP"
          ? "jp"
          : fields.countryCode === "KR"
            ? "kr"
            : profile.searchHints.countryBias,
      areaLabel: fields.hierarchyKo,
      localityQuery: fields.district || fields.city || profile.searchHints.localityQuery,
    },
  };
}
