import type { KoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { matchKoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";
import { projectWorldGeoToPlaceFields } from "@/lib/reality-graph/project-to-place-profile";

export type SpatialTargetFromText = {
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
  readonly query: string;
  readonly source: "known_registry" | "side_cue" | "reality_graph";
  readonly zoneId?: string;
};

const SIDE_CUE =
  /(?:쪽|근처|주변|near|around)\s*$/iu;

/** Strip trailing side cues — 「서면쪽」→「서면」. */
export function normalizeSpatialSideCue(text: string): string {
  return normalizePlaceLabel(text)
    .replace(/\s*(?:쪽|근처|주변|near|around)\s*$/giu, "")
    .trim();
}

function extractSpatialFragments(text: string): string[] {
  const normalized = normalizePlaceLabel(text);
  if (!normalized) {
    return [];
  }
  const fragments = new Set<string>();
  fragments.add(normalized);

  const sideMatch = normalized.match(
    /([가-힣A-Za-z0-9\s]{2,24})(?:쪽|근처|주변)/giu,
  );
  if (sideMatch) {
    for (const hit of sideMatch) {
      fragments.add(normalizeSpatialSideCue(hit));
    }
  }

  const cityDistrict = normalized.match(/([가-힣]{2,8})\s+([가-힣]{2,8})(?:쪽|근처|주변)?/u);
  if (cityDistrict?.[0]) {
    fragments.add(normalizeSpatialSideCue(cityDistrict[0]));
  }
  if (cityDistrict?.[2]) {
    fragments.add(normalizeSpatialSideCue(cityDistrict[2]));
  }

  return [...fragments].filter((row) => row.length >= 2);
}

function toSpatialTarget(
  place: KoreaKnownPlace,
  query: string,
  source: SpatialTargetFromText["source"],
): SpatialTargetFromText {
  return {
    label: place.label,
    lat: place.lat,
    lng: place.lng,
    query,
    source,
  };
}

/** Sync spatial target — known city · neighborhood · POI registry · Reality Graph. */
export function resolveSpatialTargetFromText(
  text: string,
): SpatialTargetFromText | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  for (const fragment of extractSpatialFragments(trimmed)) {
    const hit = matchKoreaKnownPlace(fragment);
    if (hit) {
      return toSpatialTarget(
        hit,
        fragment,
        SIDE_CUE.test(fragment) ? "side_cue" : "known_registry",
      );
    }
  }

  const direct = matchKoreaKnownPlace(trimmed);
  if (direct) {
    return toSpatialTarget(direct, trimmed, "known_registry");
  }

  for (const fragment of extractSpatialFragments(trimmed)) {
    const geo = projectWorldGeoToPlaceFields(fragment);
    if (geo) {
      return {
        label: geo.label,
        lat: geo.lat,
        lng: geo.lng,
        query: fragment,
        source: "reality_graph",
        zoneId: geo.zoneId,
      };
    }
  }

  const geoDirect = projectWorldGeoToPlaceFields(trimmed);
  if (geoDirect) {
    return {
      label: geoDirect.label,
      lat: geoDirect.lat,
      lng: geoDirect.lng,
      query: trimmed,
      source: "reality_graph",
      zoneId: geoDirect.zoneId,
    };
  }

  return null;
}
