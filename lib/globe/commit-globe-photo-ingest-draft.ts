"use client";

import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import { commitPreparedGlobeMediaClusters } from "@/lib/feed/ingest-globe-context-media";
import type { GlobeBulkMediaIngestSummary } from "@/lib/feed/ingest-globe-context-media";

function buildBulkToastFromCommit(input: {
  total: number;
  succeeded: number;
  failed: number;
  attached: number;
  separated: number;
  pinsCreated: number;
  exifPinned: number;
  poolStaged: number;
  lastError?: string | null;
}): string {
  if (input.succeeded === 0) {
    if (input.failed > 0 && input.lastError?.trim()) {
      return input.lastError.trim();
    }
    if (input.poolStaged > 0) {
      return "보관함에만 넣었어요 · 맥락은 나중에";
    }
    return "사진·동영상을 넣지 못했어요";
  }
  if (input.poolStaged > 0 && input.poolStaged === input.succeeded) {
    return input.total === 1
      ? "보관함에 넣었어요 · 맥락은 나중에"
      : `보관함 ${input.poolStaged}개 · 맥락은 나중에 만들 수 있어요`;
  }
  if (input.total === 1) {
    if (input.exifPinned > 0 && input.pinsCreated > 0) {
      return "사진 위치를 읽어 지도에 핀을 꽂았어요";
    }
    if (input.pinsCreated > 0) {
      return "흔적을 남겼어요";
    }
    return input.failed > 0 ? "1개를 넣지 못했어요" : "흔적을 남겼어요";
  }
  const parts: string[] = [];
  if (input.exifPinned > 0 && input.pinsCreated > 0) {
    parts.push(
      input.pinsCreated > 1
        ? `사진 ${input.succeeded}개 · 지도에 ${input.pinsCreated}곳 핀`
        : `사진 ${input.succeeded}개 · 지도에 핀 꽂았어요`,
    );
  } else {
    parts.push(`사진 ${input.succeeded}개 · 맥락을 만들었어요`);
  }
  if (input.failed > 0) {
    parts.push(`${input.failed}개 실패`);
  }
  return parts.join(" · ");
}

/** User tapped 맞아요 — commit prepared clusters. */
export async function commitGlobePhotoIngestDraft(
  draft: GlobePhotoIngestDraft,
  input?: {
    hintEventId?: string | null;
    hintTitle?: string | null;
    forceAttachToHint?: boolean;
    onProgress?: (done: number, total: number) => void;
    onFilePrepare?: (message: string) => void;
  },
): Promise<GlobeBulkMediaIngestSummary> {
  const committed = await commitPreparedGlobeMediaClusters({
    mediaFiles: draft.mediaFiles,
    clusters: draft.clusters,
    hintEventId: input?.hintEventId,
    hintTitle: input?.hintTitle,
    forceAttachToHint: input?.forceAttachToHint,
    userConfirmedContext: true,
    onProgress: input?.onProgress,
    onFilePrepare: input?.onFilePrepare,
  });
  const contextOutcomes = committed.outcomes.filter((row) => !row.stagedToPool);
  const succeeded = contextOutcomes.length;
  const lastSuggestedPlaceName =
    [...committed.outcomes]
      .reverse()
      .find((row) => row.suggestedPlaceName?.trim())
      ?.suggestedPlaceName?.trim() ?? null;

  return {
    total: draft.totalFiles,
    succeeded,
    failed: committed.failed,
    attached: committed.attached,
    separated: committed.separated,
    pinsCreated: committed.pinsCreated,
    exifPinned: committed.exifPinned,
    poolStaged: committed.poolStaged,
    lastEventId: committed.lastEventId,
    toastLine: buildBulkToastFromCommit({
      total: draft.totalFiles,
      succeeded,
      failed: committed.failed,
      attached: committed.attached,
      separated: committed.separated,
      pinsCreated: committed.pinsCreated,
      exifPinned: committed.exifPinned,
      poolStaged: committed.poolStaged,
      lastError: committed.lastError,
    }),
    lastSuggestedPlaceName,
    lastError: committed.lastError,
    outcomes: committed.outcomes,
  };
}
