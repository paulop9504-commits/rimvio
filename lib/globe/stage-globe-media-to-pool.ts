"use client";

import { attachMediaSpacetime } from "@/lib/location-ping/attach-media-spacetime";
import { saveMediaSpacetimeContext } from "@/lib/location-ping/media-context-store";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";
import {
  MEDIA_POOL_ORIGIN_REF,
  MEDIA_POOL_RETENTION_MS,
} from "@/lib/media-pool/media-pool-constants";
import { isGlobeContextIngestMediaFile } from "@/lib/feed/ingest-globe-context-media";

/** User chose "나중에" — stash media without creating a globe context. */
export async function stageGlobeMediaFilesToPool(
  files: readonly File[],
  onFilePrepare?: (message: string) => void,
): Promise<{ staged: number; toastLine: string }> {
  const mediaFiles = files.filter(isGlobeContextIngestMediaFile);
  let staged = 0;

  for (const file of mediaFiles) {
    onFilePrepare?.("보관함에 넣는 중…");
    const context = await attachMediaSpacetime({
      file,
      origin: "media_pool",
      originRef: MEDIA_POOL_ORIGIN_REF,
      onFilePrepare,
    });
    const row: MediaSpacetimeContext = {
      ...context,
      poolStatus: "staged",
      expiresAtIso: new Date(Date.now() + MEDIA_POOL_RETENTION_MS).toISOString(),
      origin: "media_pool",
      originRef: MEDIA_POOL_ORIGIN_REF,
    };
    await saveMediaSpacetimeContext(row);
    staged += 1;
  }

  const toastLine =
    staged === 1
      ? "사진 보관함에 넣었어요 · 맥락은 나중에"
      : `보관함 ${staged}장 · 맥락은 나중에 만들 수 있어요`;

  return { staged, toastLine };
}
