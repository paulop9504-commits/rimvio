export type { CaptureIndexRow, VaultSyncQueueRow } from "@/lib/materialize/types";
export { encodeGeohash } from "@/lib/materialize/encode-geohash";
export { hashBlobSha256, hashFileSha256 } from "@/lib/materialize/hash-blob";
export {
  hydrateMaterializeStore,
  resetMaterializeStoreForTests,
  readCaptureIndexMemory,
  readSyncQueueMemory,
  countCaptureIndexRows,
  MATERIALIZE_UPDATED,
} from "@/lib/materialize/materialize-db";
export {
  indexMediaContext,
  markCaptureIndexQueued,
  markCaptureIndexSynced,
} from "@/lib/materialize/index-from-media-context";
export {
  enqueueVaultSync,
  enqueueCaptureAndMediaBlobSync,
} from "@/lib/materialize/enqueue-vault-sync";
export { flushVaultSyncQueue } from "@/lib/materialize/flush-vault-sync-client";
export { buildLifeEventVaultSnapshot } from "@/lib/materialize/life-event-vault-snapshot";
export { enqueueLifeEventVaultSync } from "@/lib/materialize/enqueue-life-event-vault-sync";
export { scheduleLifeEventVaultSync } from "@/lib/materialize/schedule-life-event-vault-sync";
