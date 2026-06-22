"use client";

import {
  applyBulkMediaClusterEnrichment,
  clusterBulkMediaSpacetime,
} from "@/lib/feed/cluster-bulk-media-spacetime";
import type {
  BulkMediaSpacetimeCluster,
  BulkMediaSpacetimePeek,
} from "@/lib/feed/bulk-media-spacetime-types";
import { peekBulkMediaSpacetime } from "@/lib/feed/peek-bulk-media-spacetime";
import { sortMediaFilesByCaptureTime } from "@/lib/feed/sort-media-files-by-capture-time";
import { fetchBulkMediaClusterEnrichment } from "@/lib/globe/fetch-bulk-media-cluster-enrichment";
import type { PhotoIngestFileItem } from "@/lib/globe/photo-ingest-file-progress";
import { validateIngestMediaFiles } from "@/lib/globe/validate-ingest-media-files";
import {
  projectGlobeContextCandidateViews,
  type GlobeContextCandidateView,
} from "@/lib/globe/project-globe-context-candidate-view";

export type GlobePhotoIngestDraft = {
  mediaFiles: File[];
  peeks: BulkMediaSpacetimePeek[];
  clusters: BulkMediaSpacetimeCluster[];
  candidates: GlobeContextCandidateView[];
  totalFiles: number;
};

export type PrepareGlobePhotoIngestOptions = {
  onProgress?: (message: string) => void;
  onFileStart?: (index: number, file: File) => void;
  onFileReady?: (index: number, file: File) => void;
};

/** Peek + cluster + enrich — no blob commit until user confirms. */
export async function prepareGlobePhotoIngestDraft(
  files: readonly File[],
  options?: PrepareGlobePhotoIngestOptions,
): Promise<GlobePhotoIngestDraft | null> {
  const validated = validateIngestMediaFiles(files);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const mediaFiles = await sortMediaFilesByCaptureTime(validated.files);
  if (mediaFiles.length === 0) {
    return null;
  }

  options?.onProgress?.("사진 시간·위치 읽는 중…");
  const peeks = await peekBulkMediaSpacetime(mediaFiles, {
    onFileStart: options?.onFileStart,
    onFileComplete: options?.onFileReady,
  });
  let clusters = clusterBulkMediaSpacetime(peeks);

  options?.onProgress?.("맥락 후보 정리 중…");
  const enrichment = await fetchBulkMediaClusterEnrichment({
    clusters,
    peeks,
    files: mediaFiles,
  });
  if (enrichment) {
    clusters = applyBulkMediaClusterEnrichment({ clusters, enrichment });
  }

  const candidates = projectGlobeContextCandidateViews({ clusters, peeks });

  return {
    mediaFiles,
    peeks,
    clusters,
    candidates,
    totalFiles: mediaFiles.length,
  };
}
