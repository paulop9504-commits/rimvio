import type { ContextHubServiceRow } from "@/lib/globe/context-hub/context-hub-service-catalog";
import { scoreHubServiceRowBase } from "@/lib/globe/context-hub/score-hub-service-row";
import type { SemanticMainHint } from "@/lib/semantic/types";

/** Browse order in expanded hub panel — semantic hint pins the one logical next step first. */
export function rankContextHubServices(
  services: readonly ContextHubServiceRow[],
  semanticHint?: SemanticMainHint | null,
): ContextHubServiceRow[] {
  return [...services]
    .filter((row) => row.offered)
    .sort((left, right) => {
      if (semanticHint) {
        if (left.serviceId === semanticHint.hubServiceId) {
          return -1;
        }
        if (right.serviceId === semanticHint.hubServiceId) {
          return 1;
        }
      }
      const delta = scoreHubServiceRowBase(right) - scoreHubServiceRowBase(left);
      if (delta !== 0) {
        return delta;
      }
      return left.labelKo.localeCompare(right.labelKo, "ko");
    });
}
