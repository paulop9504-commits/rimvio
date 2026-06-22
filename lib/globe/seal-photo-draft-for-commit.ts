import { applyPlaceOverrideToPhotoDraft } from "@/lib/globe/apply-place-override-to-photo-draft";
import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import type { ResolvedGlobePhotoPlaceBranch } from "@/lib/globe/resolve-globe-photo-place-branch";

/** User confirmed — stamp place + bypass pool before commit. */
export function sealPhotoDraftForCommit(
  draft: GlobePhotoIngestDraft,
  branch: ResolvedGlobePhotoPlaceBranch | null,
): GlobePhotoIngestDraft {
  const place =
    branch?.placeLabel?.trim() ||
    draft.candidates[0]?.placeLabel?.trim() ||
    draft.clusters[0]?.placeLabel?.trim() ||
    "";

  if (!place) {
    return {
      ...draft,
      clusters: draft.clusters.map((cluster) => ({
        ...cluster,
        bypassPool: true,
      })),
    };
  }

  return applyPlaceOverrideToPhotoDraft(draft, {
    placeLabel: place,
    lat: branch?.lat ?? draft.clusters[0]?.anchor.lat ?? null,
    lng: branch?.lng ?? draft.clusters[0]?.anchor.lng ?? null,
    title: draft.candidates[0]?.title ?? draft.clusters[0]?.title ?? null,
  });
}
