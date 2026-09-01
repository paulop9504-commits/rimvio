/**
 * Server-side durable store — memory cache + Supabase SSOT on hydrate/write.
 */

import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";
import type { PersistedGoalState } from "../types";
import type { SandboxSession } from "@/lib/sandbox/types";
import {
  upsertGoalStateToSupabase,
  upsertRegistryEntryToSupabase,
  upsertRegistryBatchToSupabase,
  upsertSandboxSessionToSupabase,
} from "./supabase-store";

type AgentPlatformGlobal = typeof globalThis & {
  __rimvioAgentPlatformRegistry?: CapabilityIndexEntry[];
  __rimvioAgentPlatformGoals?: Record<string, PersistedGoalState>;
  __rimvioAgentPlatformSandbox?: Record<string, SandboxSession>;
};

function g(): AgentPlatformGlobal {
  return globalThis as AgentPlatformGlobal;
}

export function readServerRegistry(): CapabilityIndexEntry[] {
  if (!g().__rimvioAgentPlatformRegistry) {
    g().__rimvioAgentPlatformRegistry = [];
  }
  return g().__rimvioAgentPlatformRegistry!;
}

export function writeServerRegistry(entries: readonly CapabilityIndexEntry[]): CapabilityIndexEntry[] {
  g().__rimvioAgentPlatformRegistry = [...entries];
  void upsertRegistryBatchToSupabase(entries);
  return g().__rimvioAgentPlatformRegistry!;
}

export function upsertServerRegistryEntry(entry: CapabilityIndexEntry): CapabilityIndexEntry[] {
  const index = readServerRegistry().filter((row) => row.capabilityId !== entry.capabilityId);
  const next = [...index, entry];
  g().__rimvioAgentPlatformRegistry = next;
  void upsertRegistryEntryToSupabase(entry);
  return next;
}

export function findServerRegistryEntry(capabilityId: string): CapabilityIndexEntry | null {
  return readServerRegistry().find((row) => row.capabilityId === capabilityId) ?? null;
}

export function readServerGoalStore(): Record<string, PersistedGoalState> {
  if (!g().__rimvioAgentPlatformGoals) {
    g().__rimvioAgentPlatformGoals = {};
  }
  return g().__rimvioAgentPlatformGoals!;
}

export function readServerGoalState(contextEventId: string): PersistedGoalState | null {
  return readServerGoalStore()[contextEventId] ?? null;
}

export function writeServerGoalState(state: PersistedGoalState): PersistedGoalState {
  const store = readServerGoalStore();
  store[state.contextEventId] = state;
  g().__rimvioAgentPlatformGoals = store;
  void upsertGoalStateToSupabase(state);
  return state;
}

export function readServerSandboxStore(): Record<string, SandboxSession> {
  if (!g().__rimvioAgentPlatformSandbox) {
    g().__rimvioAgentPlatformSandbox = {};
  }
  return g().__rimvioAgentPlatformSandbox!;
}

export function persistSandboxSessionSnapshot(session: SandboxSession): void {
  const store = readServerSandboxStore();
  store[session.sessionId] = session;
  g().__rimvioAgentPlatformSandbox = store;
  void upsertSandboxSessionToSupabase(session);
}

export function readSandboxSessionSnapshot(sessionId: string): SandboxSession | null {
  return readServerSandboxStore()[sessionId] ?? null;
}

export function listSandboxSessionSnapshots(): SandboxSession[] {
  return Object.values(readServerSandboxStore()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function resetAgentPlatformStoresForTests(): void {
  g().__rimvioAgentPlatformRegistry = [];
  g().__rimvioAgentPlatformGoals = {};
  g().__rimvioAgentPlatformSandbox = {};
}
