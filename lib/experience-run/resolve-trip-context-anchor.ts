import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  buildCanonicalPlaceProfile,
  type CanonicalPlaceProfile,
} from "@/lib/globe/canonical-place-profile";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";
import { enrichCanonicalPlaceProfileFromRealityGraph } from "@/lib/reality-graph/project-to-place-profile";
import { projectWorldGeoToPlaceFields } from "@/lib/reality-graph/project-to-place-profile";
import { resolveLocationFromText } from "@/lib/location-engine/resolve-location";
import { isCountryOrRegionDestinationLabel } from "@/lib/globe-ingress/is-country-or-region-destination";

export type TripContextAnchor = {
  placeLabel: string;
  lat: number;
  lng: number;
  profile: CanonicalPlaceProfile;
  /** Reality Graph entity when known. */
  zoneId?: string;
  /** How coords were obtained — sync dictionary vs open-world geocode. */
  resolveSource?: "world_geo" | "domestic" | "overseas_registry" | "nominatim";
};

/** Stable explicit destination anchor for trip contexts (sync dictionaries). */
export function resolveTripContextAnchor(
  placeLabel: string | null | undefined,
): TripContextAnchor | null {
  const label = placeLabel?.trim();
  if (!label) {
    return null;
  }

  // Country ≠ city — never pin country centroid / capital as destination.
  if (isCountryOrRegionDestinationLabel(label)) {
    return null;
  }

  const world = projectWorldGeoToPlaceFields(label);
  if (world) {
    const profile = enrichCanonicalPlaceProfileFromRealityGraph(
      buildCanonicalPlaceProfile({
        lat: world.lat,
        lng: world.lng,
        label: world.label,
        formattedAddress: world.hierarchyKo,
        anchorSource: "explicit_destination",
        confidence: world.confidence,
      }),
      label,
    );
    return {
      placeLabel: world.label,
      lat: world.lat,
      lng: world.lng,
      profile,
      zoneId: world.zoneId,
      resolveSource: "world_geo",
    };
  }

  const domestic = resolveRunPlaceFromText(label);
  if (domestic) {
    return {
      ...domestic,
      profile: enrichCanonicalPlaceProfileFromRealityGraph(
        buildCanonicalPlaceProfile({
          lat: domestic.lat,
          lng: domestic.lng,
          label: domestic.placeLabel,
          anchorSource: "explicit_destination",
          confidence: 0.98,
        }),
        domestic.placeLabel,
      ),
      resolveSource: "domestic",
    };
  }

  const overseas = classifyOverseasManualPlace(label);
  if (overseas) {
    // Multi-hub country (필리핀 · 일본 · …) — do not pin capital as city destination.
    if (
      overseas.kind === "country" &&
      isCountryOrRegionDestinationLabel(overseas.label)
    ) {
      return null;
    }
    return {
      placeLabel: overseas.label,
      lat: overseas.lat,
      lng: overseas.lng,
      profile: enrichCanonicalPlaceProfileFromRealityGraph(
        buildCanonicalPlaceProfile({
          lat: overseas.lat,
          lng: overseas.lng,
          label: overseas.label,
          formattedAddress: `${overseas.label}, ${overseas.countryLabel}`,
          anchorSource: "explicit_destination",
          confidence: 0.99,
        }),
        overseas.label,
      ),
      resolveSource: "overseas_registry",
    };
  }

  // Bare multi-hub country label with no registry city match
  if (isCountryOrRegionDestinationLabel(label)) {
    return null;
  }

  return null;
}

/**
 * Open-world destination resolve — dictionaries first, then Location Engine (Nominatim).
 * Use for NL move / create when sync registries miss secondary overseas cities.
 */
export async function resolveTripContextAnchorAsync(
  placeLabel: string | null | undefined,
): Promise<TripContextAnchor | null> {
  const label = placeLabel?.trim();
  if (!label) return null;

  // Country-scale → never Nominatim-capital as confirmed city
  if (isCountryOrRegionDestinationLabel(label)) {
    return null;
  }

  const sync = resolveTripContextAnchor(label);
  if (sync) return sync;

  const located = await resolveLocationFromText(label);
  const entity = located?.entity;
  if (!entity) return null;
  if (!Number.isFinite(entity.lat) || !Number.isFinite(entity.lng)) return null;

  const placeName =
    entity.labelKo?.trim() ||
    entity.labelEn?.trim() ||
    label;

  if (isCountryOrRegionDestinationLabel(placeName)) {
    return null;
  }

  return {
    placeLabel: placeName,
    lat: entity.lat,
    lng: entity.lng,
    profile: enrichCanonicalPlaceProfileFromRealityGraph(
      buildCanonicalPlaceProfile({
        lat: entity.lat,
        lng: entity.lng,
        label: placeName,
        formattedAddress:
          entity.formattedAddress?.trim() ||
          entity.hierarchyKo?.trim() ||
          placeName,
        anchorSource: "explicit_destination",
        confidence: Math.max(0.7, entity.confidence ?? 0.75),
      }),
      placeName,
    ),
    zoneId: entity.id,
    resolveSource: "nominatim",
  };
}
