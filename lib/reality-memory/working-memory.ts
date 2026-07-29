/**
 * Working Memory — current conversation slot/fact buffer with eviction.
 */

import type { MemoryEntry } from "@/lib/reality-memory/types";

const MAX_WORKING_ENTRIES = 50;
const buffer: MemoryEntry[] = [];

export function addWorkingMemory(entry: Omit<MemoryEntry, "tier" | "id" | "createdAt">): MemoryEntry {
  const full: MemoryEntry = {
    ...entry,
    id: `wm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tier: "working",
    createdAt: new Date().toISOString(),
  };
  buffer.push(full);
  if (buffer.length > MAX_WORKING_ENTRIES) {
    buffer.shift();
  }
  return full;
}

export function queryWorkingMemory(key?: string): readonly MemoryEntry[] {
  if (!key) return [...buffer];
  return buffer.filter((e) => e.key === key);
}

export function clearWorkingMemory(): void {
  buffer.length = 0;
}

export function getWorkingMemorySize(): number {
  return buffer.length;
}
