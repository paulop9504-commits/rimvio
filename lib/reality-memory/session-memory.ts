/**
 * Session Memory — sessionStorage-based per-session persistence.
 */

import type { MemoryEntry } from "@/lib/reality-memory/types";

const SESSION_KEY = "rimvio.session-memory.v1";

function readAll(): MemoryEntry[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: MemoryEntry[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entries));
  } catch { /* quota */ }
}

export function addSessionMemory(entry: Omit<MemoryEntry, "tier" | "id" | "createdAt">): MemoryEntry {
  const full: MemoryEntry = {
    ...entry,
    id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tier: "session",
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(full);
  writeAll(all);
  return full;
}

export function querySessionMemory(contextId?: string | null): readonly MemoryEntry[] {
  const all = readAll();
  if (!contextId) return all;
  return all.filter((e) => e.contextId === contextId);
}

export function clearSessionMemory(): void {
  writeAll([]);
}
