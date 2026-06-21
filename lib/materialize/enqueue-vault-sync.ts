import {
  findCaptureByMediaContextId,
  listPendingSyncQueueRows,
  upsertSyncQueueRow,
} from "@/lib/materialize/materialize-db";
import { markCaptureIndexQueued } from "@/lib/materialize/index-from-media-context";
import type { VaultSyncQueueKind, VaultSyncQueueRow } from "@/lib/materialize/types";
import {
  captureVaultKey,
  mediaBlobVaultKey,
} from "@/lib/vault/vault-object-keys";

function newQueueId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveObjectKey(
  kind: VaultSyncQueueKind,
  mediaContextId: string,
  eventId: string | null,
): string {
  if (kind === "media_blob") {
    return mediaBlobVaultKey(mediaContextId);
  }
  return captureVaultKey(eventId ?? "unattached", mediaContextId);
}

/** Enqueue encrypted vault mirror sync for a capture index row. */
export async function enqueueVaultSync(input: {
  kind: VaultSyncQueueKind;
  mediaContextId: string;
}): Promise<VaultSyncQueueRow | null> {
  const mediaContextId = input.mediaContextId.trim();
  if (!mediaContextId) {
    return null;
  }

  const capture = await findCaptureByMediaContextId(mediaContextId);
  if (!capture) {
    return null;
  }
  if (capture.syncState === "synced") {
    return null;
  }

  const objectKey = resolveObjectKey(
    input.kind,
    mediaContextId,
    capture.eventId,
  );
  const nowIso = new Date().toISOString();
  const pending = await listPendingSyncQueueRows(200);
  const existing = pending.find(
    (row) => row.objectKey === objectKey && row.kind === input.kind,
  );
  if (existing) {
    return existing;
  }

  await markCaptureIndexQueued(mediaContextId);

  const row: VaultSyncQueueRow = {
    id: newQueueId(),
    objectKey,
    kind: input.kind,
    mediaContextId,
    eventId: null,
    status: "pending",
    attempts: 0,
    lastError: null,
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };

  return upsertSyncQueueRow(row);
}

/** After blob + context saved — index metadata and queue vault mirror. */
export async function enqueueCaptureAndMediaBlobSync(
  mediaContextId: string,
): Promise<void> {
  const key = mediaContextId.trim();
  if (!key) {
    return;
  }
  await enqueueVaultSync({ kind: "capture", mediaContextId: key });
  await enqueueVaultSync({ kind: "media_blob", mediaContextId: key });
}
