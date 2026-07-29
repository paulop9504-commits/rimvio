/**
 * Project Memory — per-context long-term memory (localStorage).
 */

import type { MemoryEntry } from "@/lib/reality-memory/types";

const PREFIX = "rimvio.project-memory.";

function storageKey(contextId: string): string {
  return `${PREFIX}${contextId}`;
}

function readEntries(contextId: string): MemoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(contextId));
    return raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(contextId: string, entries: MemoryEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(contextId), JSON.stringify(entries));
  } catch { /* quota */ }
}

export function addProjectMemory(
  contextId: string,
  entry: Omit<MemoryEntry, "tier" | "id" | "createdAt" | "contextId">,
): MemoryEntry {
  const full: MemoryEntry = {
    ...entry,
    id: `pm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tier: "project",
    contextId,
    createdAt: new Date().toISOString(),
  };
  const all = readEntries(contextId);
  all.push(full);
  writeEntries(contextId, all);
  return full;
}

export function queryProjectMemory(contextId: string, key?: string): readonly MemoryEntry[] {
  const all = readEntries(contextId);
  if (!key) return all;
  return all.filter((e) => e.key === key);
}

export function clearProjectMemory(contextId: string): void {
  writeEntries(contextId, []);
}
