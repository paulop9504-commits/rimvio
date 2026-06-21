import {
  enqueueCaptureAndMediaBlobSync,
  enqueueVaultSync,
} from "@/lib/materialize/enqueue-vault-sync";
import { hashFileSha256 } from "@/lib/materialize/hash-blob";
import { indexMediaContext } from "@/lib/materialize/index-from-media-context";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

/** Device index + vault sync queue after local media persist (fire-and-forget). */
export async function materializeAfterMediaSave(input: {
  context: MediaSpacetimeContext;
  file?: File | null;
}): Promise<void> {
  const fileHash = input.file ? await hashFileSha256(input.file) : null;
  const indexed = await indexMediaContext({
    context: input.context,
    fileHash,
  });

  if (indexed.outcome === "deduped" || indexed.outcome === "skipped") {
    return;
  }

  const mediaContextId = input.context.id;
  if (input.file) {
    await enqueueCaptureAndMediaBlobSync(mediaContextId);
    return;
  }

  await enqueueVaultSync({ kind: "capture", mediaContextId });
}

export function scheduleMaterializeAfterMediaSave(input: {
  context: MediaSpacetimeContext;
  file?: File | null;
}): void {
  void materializeAfterMediaSave(input).catch(() => {
    /* offline index — retry on next save or vault flush */
  });
}
