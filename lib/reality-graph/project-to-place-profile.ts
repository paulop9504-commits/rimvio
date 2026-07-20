import type { CanonicalPlaceProfile } from "@/lib/globe/canonical-place-profile";
import { formatWorldGeoHierarchyKo } from "@/lib/reality-graph/answer-admin-division";
import { resolveWorldGeoEntity } from "@/lib/reality-graph/resolve-world-geo";
import type { WorldGeoEntityId, WorldGeoNode } from "@/lib/reality-graph/types";

function normalizeGeoAlias(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

/**
 * User-facing place string — prefer colloquial alias matched in the query
 * (오사카) over official admin label (오사카부). Hierarchy strings keep official names.
 */
export function userFacingWorldGeoLabel(
  node: WorldGeoNode,
  queryText: string,
): string {
  const aliases = node.labels.aliases ?? [];
  const nq = normalizeGeoAlias(queryText);
  const matched = aliases
    .filter((alias) => {
      const na = normalizeGeoAlias(alias);
      return na.length >= 2 && (nq === na || nq.includes(na));
    })
    .sort(
      (a, b) => normalizeGeoAlias(b).length - normalizeGeoAlias(a).length,
    );
  if (matched.length === 0) {
    return node.labels.ko;
  }
  const hangulColloquial = matched.find(
    (alias) => /^[가-힣]+$/u.test(alias) && !/[도부현]$/u.test(alias),
  );
  if (hangulColloquial) {
    return hangulColloquial;
  }
  return matched[0]!;
}

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
    hit.node.kind === "metropolis" ||
    hit.node.kind === "city" ||
    hit.node.kind === "prefecture"
      ? hit.node
      : region;
  const district =
    hit.node.kind === "ward" || hit.node.kind === "district" ? hit.node : null;
  const neighborhood = hit.node.kind === "neighborhood" ? hit.node : null;
  const facing = userFacingWorldGeoLabel(hit.node, text);
  const cityFacing = city ? userFacingWorldGeoLabel(city, text) : null;

  return {
    zoneId: hit.node.id,
    label: facing,
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
    region: region ? userFacingWorldGeoLabel(region, text) : null,
    city: cityFacing,
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
