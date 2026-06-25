import type { PersonalContextBridgeHit } from "@/lib/personal-context-ask/personal-context-ask-types";

function readTimeMs(iso: string | null): number {
  if (!iso) {
    return 0;
  }
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Primary bridge for inline asset restore — richest photos, then newest. */
export function pickAskPrimaryHit(
  hits: readonly PersonalContextBridgeHit[],
): PersonalContextBridgeHit | null {
  if (hits.length === 0) {
    return null;
  }
  if (hits.length === 1) {
    return hits[0]!;
  }
  return [...hits].sort(
    (left, right) =>
      right.photoCount - left.photoCount ||
      readTimeMs(right.atIso) - readTimeMs(left.atIso),
  )[0]!;
}
