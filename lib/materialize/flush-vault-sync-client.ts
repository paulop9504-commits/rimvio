import { markCaptureIndexSynced } from "@/lib/materialize/index-from-media-context";
import {
  findCaptureByMediaContextId,
  listPendingSyncQueueRows,
  upsertSyncQueueRow,
} from "@/lib/materialize/materialize-db";
import type {
  CaptureVaultPayload,
  MediaBlobVaultPayload,
  VaultSyncQueueRow,
} from "@/lib/materialize/types";
import { readMediaBlob } from "@/lib/location-ping/media-blob-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { buildLifeEventVaultSnapshot } from "@/lib/materialize/life-event-vault-snapshot";

export type FlushVaultSyncResult = {
  processed: number;
  synced: number;
  failed: number;
};

function buildCapturePayload(
  capture: NonNullable<Awaited<ReturnType<typeof findCaptureByMediaContextId>>>,
): CaptureVaultPayload {
  return {
    mediaContextId: capture.mediaContextId,
    fileHash: capture.fileHash,
    takenAtIso: capture.takenAtIso,
    geohash: capture.geohash,
    lat: capture.lat,
    lng: capture.lng,
    eventId: capture.eventId,
    syncedAtIso: new Date().toISOString(),
  };
}

async function syncCaptureMetadata(row: VaultSyncQueueRow): Promise<void> {
  const capture = await findCaptureByMediaContextId(row.mediaContextId ?? "");
  if (!capture) {
    throw new Error("capture_index_missing");
  }

  const response = await fetch("/api/vault/objects", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey: row.objectKey,
      kind: "capture",
      payload: buildCapturePayload(capture),
      contentType: "application/json",
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "vault_capture_sync_failed");
  }

  await markCaptureIndexSynced(capture.mediaContextId);
}

async function syncMediaBlob(row: VaultSyncQueueRow): Promise<void> {
  const mediaContextId = row.mediaContextId?.trim() ?? "";
  const capture = await findCaptureByMediaContextId(mediaContextId);
  if (!capture) {
    throw new Error("capture_index_missing");
  }

  const blob = await readMediaBlob(mediaContextId);
  if (!blob) {
    throw new Error("media_blob_missing");
  }

  const uploadResponse = await fetch("/api/vault/upload-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: blob.type || "application/octet-stream",
    }),
  });

  if (!uploadResponse.ok) {
    const data = (await uploadResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "vault_upload_url_failed");
  }

  const upload = (await uploadResponse.json()) as {
    signedUrl?: string;
    path?: string;
  };
  if (!upload.signedUrl || !upload.path) {
    throw new Error("vault_upload_url_invalid");
  }

  const putBlob = await fetch(upload.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": blob.type || "application/octet-stream",
    },
    body: blob,
  });
  if (!putBlob.ok) {
    throw new Error("vault_blob_upload_failed");
  }

  const metadata: MediaBlobVaultPayload = {
    ...buildCapturePayload(capture),
    mimeType: blob.type || null,
    byteSize: blob.size,
  };

  const registerResponse = await fetch("/api/vault/objects", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey: row.objectKey,
      kind: "media_blob",
      payload: metadata,
      storagePath: upload.path,
      byteSize: blob.size,
      contentType: blob.type || "application/octet-stream",
    }),
  });

  if (!registerResponse.ok) {
    const data = (await registerResponse.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "vault_media_register_failed");
  }

  await markCaptureIndexSynced(capture.mediaContextId);
}

async function syncLifeEvent(row: VaultSyncQueueRow): Promise<void> {
  const eventId = row.eventId?.trim() ?? "";
  if (!eventId) {
    throw new Error("life_event_id_missing");
  }

  const event = findLifeEventCandidate(eventId);
  if (!event) {
    throw new Error("life_event_not_found");
  }

  const response = await fetch("/api/vault/objects", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey: row.objectKey,
      kind: "life_event",
      payload: buildLifeEventVaultSnapshot(event),
      contentType: "application/json",
      metadata: { updatedAt: event.updatedAt },
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "vault_life_event_sync_failed");
  }
}

async function processQueueRow(row: VaultSyncQueueRow): Promise<void> {
  const syncing: VaultSyncQueueRow = {
    ...row,
    status: "syncing",
    updatedAtIso: new Date().toISOString(),
  };
  await upsertSyncQueueRow(syncing);

  if (row.kind === "capture") {
    await syncCaptureMetadata(row);
  } else if (row.kind === "media_blob") {
    await syncMediaBlob(row);
  } else if (row.kind === "life_event") {
    await syncLifeEvent(row);
  } else {
    throw new Error("unknown_sync_kind");
  }

  await upsertSyncQueueRow({
    ...syncing,
    status: "done",
    updatedAtIso: new Date().toISOString(),
  });
}

/** Drain pending device sync queue → encrypted Personal Vault (online + logged in). */
export async function flushVaultSyncQueue(input?: {
  limit?: number;
}): Promise<FlushVaultSyncResult> {
  const limit = input?.limit ?? 8;
  const pending = await listPendingSyncQueueRows(limit);

  let synced = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      await processQueueRow(row);
      synced += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "sync_failed";
      await upsertSyncQueueRow({
        ...row,
        status: "failed",
        attempts: row.attempts + 1,
        lastError: message,
        updatedAtIso: new Date().toISOString(),
      });
    }
  }

  return {
    processed: pending.length,
    synced,
    failed,
  };
}
