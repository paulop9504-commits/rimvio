import { encodeGeohash } from "@/lib/materialize/encode-geohash";
import {
  findCaptureByFileHash,
  findCaptureByMediaContextId,
  upsertCaptureIndexRow,
} from "@/lib/materialize/materialize-db";
import type { CaptureIndexRow } from "@/lib/materialize/types";
import type { MediaSpacetimeContext } from "@/lib/location-ping/types";

export type IndexMediaContextInput = {
  context: MediaSpacetimeContext;
  fileHash?: string | null;
  eventId?: string | null;
};

export type IndexMediaContextResult =
  | { outcome: "indexed"; row: CaptureIndexRow }
  | { outcome: "deduped"; existing: CaptureIndexRow }
  | { outcome: "skipped"; reason: "missing_id" };

function buildRow(input: IndexMediaContextInput): CaptureIndexRow | null {
  const mediaContextId = input.context.id.trim();
  if (!mediaContextId) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const lat = input.context.lat;
  const lng = input.context.lng;
  const geohash =
    lat != null && lng != null ? encodeGeohash(lat, lng) || null : null;

  return {
    id: mediaContextId,
    fileHash: input.fileHash?.trim() || null,
    takenAtIso: input.context.capturedAtIso,
    geohash,
    lat,
    lng,
    mediaContextId,
    eventId: input.eventId?.trim() || input.context.originRef?.trim() || null,
    syncState: "local",
    updatedAtIso: nowIso,
  };
}

/** Upsert device capture_index row — dedupe by file_hash when present. */
export async function indexMediaContext(
  input: IndexMediaContextInput,
): Promise<IndexMediaContextResult> {
  const row = buildRow(input);
  if (!row) {
    return { outcome: "skipped", reason: "missing_id" };
  }

  const fileHash = row.fileHash;
  if (fileHash) {
    const duplicate = await findCaptureByFileHash(fileHash);
    if (duplicate && duplicate.id !== row.id) {
      return { outcome: "deduped", existing: duplicate };
    }
  }

  const existing = await findCaptureByMediaContextId(row.mediaContextId);
  const merged: CaptureIndexRow = existing
    ? {
        ...existing,
        ...row,
        fileHash: row.fileHash ?? existing.fileHash,
        eventId: row.eventId ?? existing.eventId,
        syncState: existing.syncState === "synced" ? "synced" : row.syncState,
      }
    : row;

  const saved = await upsertCaptureIndexRow(merged);
  return { outcome: "indexed", row: saved };
}

export async function markCaptureIndexQueued(
  mediaContextId: string,
): Promise<CaptureIndexRow | null> {
  const existing = await findCaptureByMediaContextId(mediaContextId);
  if (!existing) {
    return null;
  }
  if (existing.syncState === "synced") {
    return existing;
  }
  return upsertCaptureIndexRow({
    ...existing,
    syncState: "queued",
    updatedAtIso: new Date().toISOString(),
  });
}

export async function markCaptureIndexSynced(
  mediaContextId: string,
): Promise<CaptureIndexRow | null> {
  const existing = await findCaptureByMediaContextId(mediaContextId);
  if (!existing) {
    return null;
  }
  return upsertCaptureIndexRow({
    ...existing,
    syncState: "synced",
    updatedAtIso: new Date().toISOString(),
  });
}
