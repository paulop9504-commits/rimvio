import type { FastScanCandidate } from "@/engines/research/schema";

/** Stage 4 — snippet-only relevance (no full page). */
export function scoreFastScanRelevance(
  candidate: FastScanCandidate,
  queries: readonly string[],
): number {
  const blob = `${candidate.title} ${candidate.snippet}`.toLowerCase();
  let hits = 0;
  let weight = 0;
  for (const q of queries) {
    const tokens = q
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
    for (const token of tokens) {
      weight += 1;
      if (blob.includes(token)) {
        hits += 1;
      }
    }
  }
  const lexical = weight > 0 ? hits / weight : 0.35;
  const pop = candidate.popularity ?? 0.4;
  const reviews =
    candidate.reviewCount != null && candidate.reviewCount > 0
      ? Math.min(1, Math.log10(candidate.reviewCount + 1) / 3)
      : 0.3;
  return Math.min(1, lexical * 0.55 + pop * 0.25 + reviews * 0.2);
}

export function annotateFastScan(
  rows: readonly FastScanCandidate[],
  queries: readonly string[],
): FastScanCandidate[] {
  return rows.map((row) => ({
    ...row,
    relevanceScore: scoreFastScanRelevance(row, queries),
  }));
}
