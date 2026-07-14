import type { ContextConditionLastBatchWire } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  readContextConditionLastBatch,
  writeContextConditionLastBatch,
} from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";

const ARCHIVE_PREFIX = "rimvio.discovery-execution-archive.";
const MAX_EXECUTIONS = 12;

/** Node / test fallback when sessionStorage is unavailable. */
const memoryArchives = new Map<string, DiscoveryExecutionSnapshot[]>();

export type DiscoveryExecutionSnapshot = ContextConditionLastBatchWire & {
  triggerMessage?: string;
};

function archiveKey(contextEventId: string): string {
  return `${ARCHIVE_PREFIX}${contextEventId.trim()}`;
}

function readArchiveRaw(contextEventId: string): DiscoveryExecutionSnapshot[] {
  const key = contextEventId.trim();
  if (!key) {
    return [];
  }
  if (typeof window === "undefined") {
    return memoryArchives.get(key) ?? [];
  }
  try {
    const raw = sessionStorage.getItem(archiveKey(key));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DiscoveryExecutionSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArchiveRaw(
  contextEventId: string,
  rows: readonly DiscoveryExecutionSnapshot[],
): void {
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  const next = rows.slice(-MAX_EXECUTIONS);
  if (typeof window === "undefined") {
    memoryArchives.set(key, [...next]);
    return;
  }
  try {
    sessionStorage.setItem(archiveKey(key), JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

/** Freeze a scout run before a fresh prompt replaces it (Cursor-like execution archive). */
export function archiveDiscoveryExecutionSnapshot(
  contextEventId: string,
  snapshot: DiscoveryExecutionSnapshot,
): void {
  const batchId = snapshot.batchId?.trim();
  if (!batchId) {
    return;
  }
  const existing = readArchiveRaw(contextEventId).filter(
    (row) => row.batchId !== batchId,
  );
  writeArchiveRaw(contextEventId, [...existing, snapshot]);
}

export function readDiscoveryExecutionSnapshot(
  contextEventId: string,
  batchId: string,
): DiscoveryExecutionSnapshot | null {
  const key = batchId.trim();
  if (!key) {
    return null;
  }
  const active = readContextConditionLastBatch(contextEventId);
  if (active?.batchId === key) {
    return active;
  }
  return readArchiveRaw(contextEventId).find((row) => row.batchId === key) ?? null;
}

/** Restore a prior scout run as the active discovery surface (feed · reel · markers). */
export function activateDiscoveryExecutionSnapshot(
  contextEventId: string,
  batchId: string,
): boolean {
  const snapshot = readDiscoveryExecutionSnapshot(contextEventId, batchId);
  if (!snapshot?.batchId?.trim()) {
    return false;
  }
  const active = readContextConditionLastBatch(contextEventId);
  if (active && active.batchId !== snapshot.batchId) {
    archiveDiscoveryExecutionSnapshot(contextEventId, active);
  }
  writeContextConditionLastBatch(contextEventId, snapshot);
  return true;
}

export function listDiscoveryExecutionSnapshots(
  contextEventId: string,
): readonly DiscoveryExecutionSnapshot[] {
  return readArchiveRaw(contextEventId);
}
