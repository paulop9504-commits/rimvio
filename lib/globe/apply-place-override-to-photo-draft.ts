import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import { projectGlobeContextCandidateViews } from "@/lib/globe/project-globe-context-candidate-view";
import { isCoordsPlaceLabel } from "@/lib/globe/is-coords-place-label";
import { matchKoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { matchKoreaKnownNeighborhood } from "@/lib/globe/korea-known-neighborhoods";
import { matchKoreaMetroDistrict } from "@/lib/globe/korea-metro-districts";

export type PhotoDraftPlaceOverride = {
  placeLabel: string;
  lat?: number | null;
  lng?: number | null;
  title?: string | null;
};

function resolveOverrideTitle(
  label: string,
  clusterTitle: string | null | undefined,
  overrideTitle: string | null | undefined,
): string {
  const explicit = overrideTitle?.trim();
  if (explicit) {
    return explicit;
  }
  const prior = clusterTitle?.trim();
  if (prior && !isCoordsPlaceLabel(prior) && !prior.includes("°")) {
    return prior;
  }
  return `${label} 흔적`;
}

/** User-picked place — applied to all clusters before commit. */
export function applyPlaceOverrideToPhotoDraft(
  draft: GlobePhotoIngestDraft,
  override: PhotoDraftPlaceOverride,
): GlobePhotoIngestDraft {
  const label = override.placeLabel.trim();
  if (!label) {
    return draft;
  }

  const metro = matchKoreaMetroDistrict(label);
  const neighborhood = matchKoreaKnownNeighborhood(label);
  const known = neighborhood
    ? neighborhood
    : metro
      ? { label: metro.label, lat: metro.lat, lng: metro.lng }
      : matchKoreaKnownPlace(label);
  const lat =
    typeof override.lat === "number" && Number.isFinite(override.lat)
      ? override.lat
      : known?.lat ?? null;
  const lng =
    typeof override.lng === "number" && Number.isFinite(override.lng)
      ? override.lng
      : known?.lng ?? null;

  const clusters = draft.clusters.map((cluster) => ({
    ...cluster,
    title: resolveOverrideTitle(label, cluster.title, override.title),
    placeLabel: known?.label ?? label,
    bypassPool: true,
    ambiguous: false,
    anchor: {
      ...cluster.anchor,
      placeLabel: known?.label ?? label,
      // Manual place text must not silently inherit the viewer's current GPS.
      lat,
      lng,
      hasGps: lat !== null && lng !== null,
    },
  }));

  const candidates = projectGlobeContextCandidateViews({
    clusters,
    peeks: draft.peeks,
  });

  return {
    ...draft,
    clusters,
    candidates,
  };
}
