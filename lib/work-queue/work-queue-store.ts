import type { WorkQueueItem } from "@/lib/work-queue/work-queue-types";
import { WORK_QUEUE_UPDATED } from "@/lib/work-queue/work-queue-types";

const STORAGE_KEY = "rimvio.work-queue.v1";

function sessionStore(): Storage | null {
  if (typeof window !== "undefined") {
    return window.sessionStorage;
  }
  const global = globalThis as { sessionStorage?: Storage };
  return global.sessionStorage ?? null;
}

function readAll(): WorkQueueItem[] {
  const storage = sessionStore();
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as WorkQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: WorkQueueItem[]): void {
  const storage = sessionStore();
  if (!storage) {
    return;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WORK_QUEUE_UPDATED));
  }
}

export function listWorkQueueItems(): WorkQueueItem[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function upsertWorkQueueItem(item: WorkQueueItem): void {
  const items = readAll();
  const index = items.findIndex((row) => row.id === item.id);
  if (index >= 0) {
    items[index] = item;
  } else {
    items.unshift(item);
  }
  writeAll(items.slice(0, 12));
}

export function removeWorkQueueItem(id: string): void {
  writeAll(readAll().filter((row) => row.id !== id));
}

export function clearWorkQueueForTests(): void {
  const storage = sessionStore();
  storage?.removeItem(STORAGE_KEY);
}

export function subscribeWorkQueueUpdated(handler: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = () => handler();
  window.addEventListener(WORK_QUEUE_UPDATED, listener);
  return () => window.removeEventListener(WORK_QUEUE_UPDATED, listener);
}
