import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import { projectGlobeContextCandidateViews } from "@/lib/globe/project-globe-context-candidate-view";

/** User-confirmed capture instant — applied to clusters + peeks before commit. */
export function applyDateOverrideToPhotoDraft(
  draft: GlobePhotoIngestDraft,
  capturedAtIso: string,
): GlobePhotoIngestDraft {
  const iso = capturedAtIso.trim();
  if (!iso) {
    return draft;
  }

  const clusters = draft.clusters.map((cluster) => ({
    ...cluster,
    bypassPool: true,
    anchor: {
      ...cluster.anchor,
      capturedAtIso: iso,
    },
  }));

  const peeks = draft.peeks.map((peek) => ({
    ...peek,
    capturedAtIso: iso,
  }));

  const candidates = projectGlobeContextCandidateViews({ clusters, peeks });

  return {
    ...draft,
    clusters,
    peeks,
    candidates,
  };
}
