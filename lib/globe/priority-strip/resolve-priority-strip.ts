import {
  PRIORITY_STRIP_KIND_RANK,
  type PriorityStripPayload,
} from "@/lib/globe/priority-strip/types";

/** Pick the single highest-priority payload for the Globe 「지금」 strip. */
export function resolvePriorityStrip(
  candidates: readonly PriorityStripPayload[],
): PriorityStripPayload | null {
  if (candidates.length === 0) {
    return null;
  }
  const ranked = [...candidates].sort((a, b) => {
    const kindA = a.kind === "protect" ? "protect" : a.kind;
    const kindB = b.kind === "protect" ? "protect" : b.kind;
    const rankA = PRIORITY_STRIP_KIND_RANK[kindA];
    const rankB = PRIORITY_STRIP_KIND_RANK[kindB];
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.id.localeCompare(b.id);
  });
  return ranked[0] ?? null;
}
