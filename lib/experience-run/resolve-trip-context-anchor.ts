import { classifyOverseasManualPlace } from "@/lib/globe/classify-overseas-manual-place";
import {
  buildCanonicalPlaceProfile,
  type CanonicalPlaceProfile,
} from "@/lib/globe/canonical-place-profile";
import { resolveRunPlaceFromText } from "@/lib/experience-run/resolve-run-place-from-text";
import { enrichCanonicalPlaceProfileFromRealityGraph } from "@/lib/reality-graph/project-to-place-profile";
import { projectWorldGeoToPlaceFields } from "@/lib/reality-graph/project-to-place-profile";

export type TripContextAnchor = {
  placeLabel: string;
  lat: number;
  lng: number;
  profile: CanonicalPlaceProfile;
  /** Reality Graph entity when known. */
  zoneId?: string;
};

/** Stable explicit destination anchor for trip contexts. */
export function resolveTripContextAnchor(
  placeLabel: string | null | undefined,
): TripContextAnchor | null {
  const label = placeLabel?.trim();
  if (!label) {
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
    };
  }

  const overseas = classifyOverseasManualPlace(label);
  if (overseas) {
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
    };
  }

  return null;
}
