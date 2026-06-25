import { marketCategoriesCompatible } from "@/lib/globe/market/market-category-registry";
import type { MarketCategoryId, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import {
  MARKET_PREFERENCE_MEMORY_SCHEMA,
  type MarketPreferenceMemoryEntry,
} from "@/lib/globe/market/preference-memory/market-preference-memory-types";
import { MARKET_PREFERENCE_MEMORY_STORAGE_KEY } from "@/lib/globe/market/preference-memory/market-preference-storage-keys";
import type { MarketQuestionEngineCategorySlug } from "@/lib/globe/market/question-engine/types";

const STORAGE_KEY = MARKET_PREFERENCE_MEMORY_STORAGE_KEY;
const MAX_ENTRIES = 80;

let memoryStore: MarketPreferenceMemoryEntry[] = [];

export function marketPreferenceMemoryId(input: {
  categorySlug: MarketQuestionEngineCategorySlug;
  role: MarketIntentRole;
  slotId: MarketPrioritySlotId;
}): string {
  return `${input.categorySlug}:${input.role}:${input.slotId}`;
}

function readAll(): MarketPreferenceMemoryEntry[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as MarketPreferenceMemoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: MarketPreferenceMemoryEntry[]) {
  const trimmed = entries
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_ENTRIES);
  if (typeof window === "undefined") {
    memoryStore = trimmed;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function resetMarketPreferenceMemoryForTests(
  entries: MarketPreferenceMemoryEntry[] = [],
) {
  memoryStore = entries;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}

export function listMarketPreferenceMemory(limit = 40): MarketPreferenceMemoryEntry[] {
  return readAll().slice(0, limit);
}

export function findMarketPreferenceMemory(input: {
  categorySlug: MarketQuestionEngineCategorySlug;
  categoryId: MarketCategoryId;
  role: MarketIntentRole;
  slotId: MarketPrioritySlotId;
}): MarketPreferenceMemoryEntry | null {
  const exactId = marketPreferenceMemoryId(input);
  const exact = readAll().find((entry) => entry.id === exactId);
  if (exact) {
    return exact;
  }

  return (
    readAll().find(
      (entry) =>
        entry.role === input.role &&
        entry.slotId === input.slotId &&
        (entry.categorySlug === input.categorySlug ||
          marketCategoriesCompatible(entry.categoryId, input.categoryId)),
    ) ?? null
  );
}

export function upsertMarketPreferenceMemory(
  entry: Omit<MarketPreferenceMemoryEntry, "schemaVersion" | "updatedAt"> & {
    updatedAt?: string;
  },
): MarketPreferenceMemoryEntry {
  const record: MarketPreferenceMemoryEntry = {
    schemaVersion: MARKET_PREFERENCE_MEMORY_SCHEMA,
    ...entry,
    updatedAt: entry.updatedAt ?? new Date().toISOString(),
  };
  writeAll([record, ...readAll().filter((item) => item.id !== record.id)]);
  return record;
}
