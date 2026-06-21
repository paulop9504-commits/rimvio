export type CaptureSyncState = "local" | "queued" | "synced";

export type CaptureIndexRow = {
  id: string;
  fileHash: string | null;
  takenAtIso: string;
  geohash: string | null;
  lat: number | null;
  lng: number | null;
  mediaContextId: string;
  eventId: string | null;
  syncState: CaptureSyncState;
  updatedAtIso: string;
};

export type VaultSyncQueueStatus = "pending" | "syncing" | "done" | "failed";

export type VaultSyncQueueKind = "capture" | "media_blob" | "life_event";

export type VaultSyncQueueRow = {
  id: string;
  objectKey: string;
  kind: VaultSyncQueueKind;
  mediaContextId: string | null;
  eventId: string | null;
  status: VaultSyncQueueStatus;
  attempts: number;
  lastError: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export type CaptureVaultPayload = {
  mediaContextId: string;
  fileHash: string | null;
  takenAtIso: string;
  geohash: string | null;
  lat: number | null;
  lng: number | null;
  eventId: string | null;
  syncedAtIso: string;
};

export type MediaBlobVaultPayload = CaptureVaultPayload & {
  mimeType: string | null;
  byteSize: number;
};
