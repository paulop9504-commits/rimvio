import type { CaptureIndexRow, VaultSyncQueueRow } from "@/lib/materialize/types";

const DB_NAME = "rimvio-materialize";
const DB_VERSION = 1;
const CAPTURE_STORE = "capture_index";
const QUEUE_STORE = "vault_sync_queue";

let memoryCaptures: CaptureIndexRow[] = [];
let memoryQueue: VaultSyncQueueRow[] = [];
let hydrated = false;

export const MATERIALIZE_UPDATED = "rimvio-materialize-updated";

function emitUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MATERIALIZE_UPDATED));
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAPTURE_STORE)) {
        const store = db.createObjectStore(CAPTURE_STORE, { keyPath: "id" });
        store.createIndex("fileHash", "fileHash", { unique: false });
        store.createIndex("takenAtIso", "takenAtIso", { unique: false });
        store.createIndex("syncState", "syncState", { unique: false });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("objectKey", "objectKey", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export function resetMaterializeStoreForTests(
  captures: CaptureIndexRow[] = [],
  queue: VaultSyncQueueRow[] = [],
) {
  memoryCaptures = captures;
  memoryQueue = queue;
  hydrated = true;
}

export async function hydrateMaterializeStore(): Promise<void> {
  if (hydrated) {
    return;
  }

  try {
    const db = await openDb();
    if (!db) {
      hydrated = true;
      return;
    }

    const [captures, queue] = await Promise.all([
      readAllFromStore<CaptureIndexRow>(db, CAPTURE_STORE),
      readAllFromStore<VaultSyncQueueRow>(db, QUEUE_STORE),
    ]);
    memoryCaptures = captures;
    memoryQueue = queue;
    hydrated = true;
  } catch {
    hydrated = true;
  }
}

async function readAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve((request.result as T[]) ?? []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

async function putInStore<T>(storeName: string, row: T): Promise<void> {
  const db = await openDb();
  if (!db) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(row);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export function readCaptureIndexMemory(): readonly CaptureIndexRow[] {
  return memoryCaptures;
}

export function readSyncQueueMemory(): readonly VaultSyncQueueRow[] {
  return memoryQueue;
}

export async function upsertCaptureIndexRow(row: CaptureIndexRow): Promise<CaptureIndexRow> {
  await hydrateMaterializeStore();
  memoryCaptures = [
    ...memoryCaptures.filter((item) => item.id !== row.id),
    row,
  ].sort(
    (left, right) => Date.parse(left.takenAtIso) - Date.parse(right.takenAtIso),
  );
  try {
    await putInStore(CAPTURE_STORE, row);
  } catch {
    /* memory mirror */
  }
  emitUpdated();
  return row;
}

export async function findCaptureByFileHash(
  fileHash: string,
): Promise<CaptureIndexRow | null> {
  await hydrateMaterializeStore();
  const key = fileHash.trim();
  if (!key) {
    return null;
  }
  return memoryCaptures.find((row) => row.fileHash === key) ?? null;
}

export async function findCaptureByMediaContextId(
  mediaContextId: string,
): Promise<CaptureIndexRow | null> {
  await hydrateMaterializeStore();
  const key = mediaContextId.trim();
  if (!key) {
    return null;
  }
  return memoryCaptures.find((row) => row.mediaContextId === key) ?? null;
}

export async function listCapturesBySyncState(
  syncState: CaptureIndexRow["syncState"],
): Promise<CaptureIndexRow[]> {
  await hydrateMaterializeStore();
  return memoryCaptures.filter((row) => row.syncState === syncState);
}

export async function upsertSyncQueueRow(row: VaultSyncQueueRow): Promise<VaultSyncQueueRow> {
  await hydrateMaterializeStore();
  memoryQueue = [
    ...memoryQueue.filter((item) => item.id !== row.id),
    row,
  ].sort(
    (left, right) => Date.parse(left.createdAtIso) - Date.parse(right.createdAtIso),
  );
  try {
    await putInStore(QUEUE_STORE, row);
  } catch {
    /* memory mirror */
  }
  emitUpdated();
  return row;
}

export async function listPendingSyncQueueRows(
  limit = 20,
): Promise<VaultSyncQueueRow[]> {
  await hydrateMaterializeStore();
  return memoryQueue
    .filter((row) => row.status === "pending" || row.status === "failed")
    .slice(0, limit);
}

export async function findSyncQueueRowByObjectKey(
  objectKey: string,
): Promise<VaultSyncQueueRow | null> {
  await hydrateMaterializeStore();
  const key = objectKey.trim();
  if (!key) {
    return null;
  }
  return memoryQueue.find((row) => row.objectKey === key) ?? null;
}

export async function countCaptureIndexRows(): Promise<number> {
  await hydrateMaterializeStore();
  return memoryCaptures.length;
}

export async function deleteSyncQueueRow(id: string): Promise<void> {
  await hydrateMaterializeStore();
  memoryQueue = memoryQueue.filter((row) => row.id !== id);
  try {
    await deleteFromStore(QUEUE_STORE, id);
  } catch {
    /* memory mirror */
  }
  emitUpdated();
}
