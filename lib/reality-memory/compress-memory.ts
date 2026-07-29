/**
 * Memory compression — summarize conversation turns for long-term retention.
 */

import type { MemoryEntry } from "@/lib/reality-memory/types";

export type CompressedSummary = {
  readonly contextId: string;
  readonly summaryKo: string;
  readonly keyFacts: readonly string[];
  readonly entryCount: number;
  readonly compressedAt: string;
};

/**
 * Extract key facts from a list of working memory entries.
 * Deterministic extraction (no LLM) — picks unique keys and their latest values.
 */
export function compressWorkingMemory(
  entries: readonly MemoryEntry[],
  contextId: string,
): CompressedSummary {
  const factMap = new Map<string, string>();

  for (const e of entries) {
    const val = typeof e.value === "string" ? e.value : JSON.stringify(e.value);
    factMap.set(e.key, val);
  }

  const keyFacts = [...factMap.entries()].map(([k, v]) => `${k}: ${v}`);

  return {
    contextId,
    summaryKo: keyFacts.length > 0
      ? `${keyFacts.length}개 항목 요약`
      : "항목 없음",
    keyFacts,
    entryCount: entries.length,
    compressedAt: new Date().toISOString(),
  };
}
