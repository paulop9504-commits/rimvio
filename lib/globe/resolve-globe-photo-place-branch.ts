import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import type { GlobeContextCandidateView } from "@/lib/globe/project-globe-context-candidate-view";

export type GlobePhotoPlaceBranch = "case_a" | "case_b";

export type ResolvedGlobePhotoPlaceBranch = {
  branch: GlobePhotoPlaceBranch;
  placeLabel: string | null;
  lat: number | null;
  lng: number | null;
  primary: GlobeContextCandidateView | null;
};

function isCoordsOnlyLabel(label: string | null | undefined): boolean {
  return Boolean(label?.includes("°"));
}

function readPrimaryCandidate(
  draft: GlobePhotoIngestDraft,
): GlobeContextCandidateView | null {
  return draft.candidates[0] ?? null;
}

function readPrimaryCluster(draft: GlobePhotoIngestDraft) {
  return draft.clusters[0] ?? null;
}

/** Case A = EXIF/GPS place is clear enough to suggest on globe. */
export function resolveGlobePhotoPlaceBranch(
  draft: GlobePhotoIngestDraft,
): ResolvedGlobePhotoPlaceBranch {
  const primary = readPrimaryCandidate(draft);
  const cluster = readPrimaryCluster(draft);
  const anchor = cluster?.anchor;

  const placeLabel =
    primary?.placeLabel?.trim() ||
    cluster?.placeLabel?.trim() ||
    anchor?.placeLabel?.trim() ||
    null;

  const lat = anchor?.lat ?? null;
  const lng = anchor?.lng ?? null;
  const hasGps =
    lat !== null &&
    lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const confident =
    Boolean(placeLabel) &&
    !isCoordsOnlyLabel(placeLabel) &&
    hasGps &&
    cluster?.ambiguous !== true &&
    primary?.ambiguous !== true &&
    cluster?.llmConfidence !== "low";

  return {
    branch: confident ? "case_a" : "case_b",
    placeLabel,
    lat,
    lng,
    primary,
  };
}
