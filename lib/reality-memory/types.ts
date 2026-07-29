/**
 * Reality Memory Engine — 4-tier memory architecture.
 *
 * Working → Session → Project → Personal (cross-context)
 */

export type MemoryTier = "working" | "session" | "project" | "personal";

export type MemoryEntry = {
  readonly id: string;
  readonly tier: MemoryTier;
  readonly contextId: string | null;
  readonly key: string;
  readonly value: unknown;
  readonly confidence: number;
  readonly createdAt: string;
  readonly expiresAt: string | null;
};

export type CrossContextPreference = {
  readonly preferenceId: string;
  readonly domain: string;
  readonly key: string;
  readonly value: string;
  readonly learnedFrom: readonly string[];
  readonly confidence: number;
};

export type MemoryQuery = {
  readonly tier?: MemoryTier;
  readonly contextId?: string | null;
  readonly domain?: string;
  readonly key?: string;
};
