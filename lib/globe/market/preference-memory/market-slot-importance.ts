import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketPrioritySlotId } from "@/lib/globe/market/market-priority-matrix";
import type { MarketQuestionEngineCategorySlug } from "@/lib/globe/market/question-engine/types";

const STORAGE_KEY = "rimvio-market-slot-importance.v1";
const MAX_ROWS = 24;

export type MarketSlotImportanceRow = {
  categorySlug: MarketQuestionEngineCategorySlug;
  role: MarketIntentRole;
  weights: Partial<Record<MarketPrioritySlotId, number>>;
  updatedAt: string;
};

let memoryStore: MarketSlotImportanceRow[] = [];

function rowId(categorySlug: MarketQuestionEngineCategorySlug, role: MarketIntentRole): string {
  return `${categorySlug}:${role}`;
}

function readAll(): MarketSlotImportanceRow[] {
  if (typeof window === "undefined") {
    return [...memoryStore];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as MarketSlotImportanceRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: MarketSlotImportanceRow[]) {
  const trimmed = rows
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_ROWS);
  if (typeof window === "undefined") {
    memoryStore = trimmed;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function resetMarketSlotImportanceForTests(rows: MarketSlotImportanceRow[] = []) {
  memoryStore = rows;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }
}

export function readMarketSlotImportanceWeights(input: {
  categorySlug: MarketQuestionEngineCategorySlug;
  role: MarketIntentRole;
}): Partial<Record<MarketPrioritySlotId, number>> {
  const id = rowId(input.categorySlug, input.role);
  return readAll().find((row) => rowId(row.categorySlug, row.role) === id)?.weights ?? {};
}

export function bumpMarketSlotImportance(input: {
  categorySlug: MarketQuestionEngineCategorySlug;
  role: MarketIntentRole;
  slotId: MarketPrioritySlotId;
  delta?: number;
}): void {
  const id = rowId(input.categorySlug, input.role);
  const existing =
    readAll().find((row) => rowId(row.categorySlug, row.role) === id) ?? {
      categorySlug: input.categorySlug,
      role: input.role,
      weights: {},
      updatedAt: new Date().toISOString(),
    };

  const prev = existing.weights[input.slotId] ?? 0.5;
  const next = Math.min(0.98, Math.max(0.1, prev + (input.delta ?? 0.08)));
  const weights = { ...existing.weights, [input.slotId]: next };

  writeAll([
    {
      ...existing,
      weights,
      updatedAt: new Date().toISOString(),
    },
    ...readAll().filter((row) => rowId(row.categorySlug, row.role) !== id),
  ]);
}
