/**
 * P6 — Workspace checkpoints + Undo/Rollback.
 * Snapshot PlatformDraft before mutating tool execution.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";

const STORAGE_KEY = "rimvio-hub-dev-checkpoints";
const MAX_CHECKPOINTS = 20;

export type HubWorkspaceCheckpoint = {
  readonly id: string;
  readonly platformId: string;
  readonly label: string;
  readonly draft: PlatformDraft;
  readonly atIso: string;
};

let memoryCheckpoints: HubWorkspaceCheckpoint[] = [];

function readStored(): HubWorkspaceCheckpoint[] {
  if (typeof window === "undefined") return memoryCheckpoints;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryCheckpoints;
    memoryCheckpoints = JSON.parse(raw) as HubWorkspaceCheckpoint[];
    return memoryCheckpoints;
  } catch {
    return memoryCheckpoints;
  }
}

function persist(list: HubWorkspaceCheckpoint[]): void {
  memoryCheckpoints = list.slice(-MAX_CHECKPOINTS);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCheckpoints));
    window.dispatchEvent(new CustomEvent("rimvio:hub-checkpoints-updated"));
  } catch {
    // ignore quota
  }
}

function cloneDraft(draft: PlatformDraft): PlatformDraft {
  return JSON.parse(JSON.stringify(draft)) as PlatformDraft;
}

let seq = 0;

export function createHubCheckpoint(input: {
  readonly platformId: string;
  readonly label: string;
  readonly draft: PlatformDraft;
}): HubWorkspaceCheckpoint {
  seq += 1;
  const checkpoint: HubWorkspaceCheckpoint = {
    id: `cp-${seq}-${Date.now()}`,
    platformId: input.platformId,
    label: input.label,
    draft: cloneDraft(input.draft),
    atIso: new Date().toISOString(),
  };
  const next = [...readStored(), checkpoint].slice(-MAX_CHECKPOINTS);
  persist(next);
  return checkpoint;
}

export function listHubCheckpoints(platformId?: string): readonly HubWorkspaceCheckpoint[] {
  const all = readStored();
  if (!platformId) return all;
  return all.filter((c) => c.platformId === platformId);
}

export function readHubCheckpoint(id: string): HubWorkspaceCheckpoint | null {
  return readStored().find((c) => c.id === id) ?? null;
}

/** Restore draft from checkpoint; returns null if not found. */
export function rollbackToHubCheckpoint(id: string): PlatformDraft | null {
  const cp = readHubCheckpoint(id);
  return cp ? cloneDraft(cp.draft) : null;
}

/** Undo = rollback to most recent checkpoint for platform. */
export function undoHubCheckpoint(platformId: string): PlatformDraft | null {
  const list = listHubCheckpoints(platformId);
  const last = list[list.length - 1];
  if (!last) return null;
  const draft = cloneDraft(last.draft);
  persist(list.slice(0, -1));
  return draft;
}

export function clearHubCheckpointsForTests(): void {
  memoryCheckpoints = [];
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

/** Mutating tools that should trigger checkpoint before execute. */
export const CHECKPOINT_MUTATING_TOOLS = new Set([
  "capability.create",
  "capability.update",
  "capability.delete",
  "schema.update",
  "workflow.create",
  "workflow.update",
  "permission.update",
  "file.write",
  "file.patch",
  "code.modifyFile",
  "publish.request",
]);
