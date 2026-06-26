"use client";

import { ingestGlobeContextMedia } from "@/lib/feed/ingest-globe-context-media";
import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import { syncPersonalGlobePinFromEvent } from "@/lib/globe/sync-personal-globe-pin";

/** Re-commit one file from a prepared walkthrough draft after a bulk failure. */
export async function retryGlobePhotoIngestFile(input: {
  draft: GlobePhotoIngestDraft;
  fileIndex: number;
  hintEventId?: string | null;
  hintTitle?: string | null;
  forceAttachToHint?: boolean;
  onFilePrepare?: (message: string) => void;
}): Promise<{ eventId: string | null; error: string | null }> {
  const file = input.draft.mediaFiles[input.fileIndex];
  if (!file) {
    return { eventId: null, error: "파일을 찾지 못했어요" };
  }

  const cluster = input.draft.clusters.find((row) =>
    row.indices.includes(input.fileIndex),
  );
  const hintTitle = cluster?.title?.trim() || input.hintTitle?.trim() || null;

  try {
    const outcome = await ingestGlobeContextMedia({
      file,
      hintEventId: input.hintEventId,
      hintTitle,
      forceAttachToHint: input.forceAttachToHint === true,
      userConfirmedContext: true,
      onFilePrepare: input.onFilePrepare,
    });
    if (outcome.stagedToPool) {
      return { eventId: null, error: null };
    }
    syncPersonalGlobePinFromEvent(outcome.result.event.id);
    return { eventId: outcome.result.event.id, error: null };
  } catch (caught) {
    const message =
      caught instanceof Error && caught.message.trim()
        ? caught.message.trim()
        : "다시 넣지 못했어요";
    return { eventId: null, error: message };
  }
}
