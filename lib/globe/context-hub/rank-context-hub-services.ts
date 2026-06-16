import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";

function scoreHubServiceRow(row: ContextHubServiceRow): number {
  if (!row.offered) {
    return 0;
  }
  if (!row.implemented) {
    return 10;
  }
  if (row.connected && row.link?.actionUrl) {
    return 100;
  }
  if (row.handoffHref) {
    return 92;
  }
  if (row.connected) {
    return 75;
  }
  return 50;
}

/** Carousel order — actionable connected first, plug-in next, soon last. */
export function rankContextHubServices(
  services: readonly ContextHubServiceRow[],
): ContextHubServiceRow[] {
  return [...services]
    .filter((row) => row.offered)
    .sort((left, right) => {
      const delta = scoreHubServiceRow(right) - scoreHubServiceRow(left);
      if (delta !== 0) {
        return delta;
      }
      return left.labelKo.localeCompare(right.labelKo, "ko");
    });
}
